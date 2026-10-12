import type { ResponseInputItem } from "openai/resources/responses/responses";
import { z } from "zod";
import { getCurrentProfile, type Profile } from "@/lib/auth";
import { logAi } from "@/lib/ai/log";
import { MAY_TOOLS, runMayTool } from "@/lib/ai/may-tools";
import { chatModel, openai } from "@/lib/ai/openai";
import { buildCompanionPrompt, MAX_OUTPUT_TOKENS, openerPrompt } from "@/lib/ai/prompts";
import { generateSuggestions } from "@/lib/ai/suggestions";
import { isChatLength, type ChatAttachment, type ChatEvent, type ChatLength } from "@/lib/chat-events";
import { getEmotion } from "@/lib/emotions";
import { searchKnowledge } from "@/lib/kb";
import { getMemories, getOpenConcerns, getOpenerContext, markConcernsAsked } from "@/lib/may-memory";
import { memoryPrompt } from "@/lib/may-memory-shared";
import { getChatPreferences, preferencePrompt } from "@/lib/personalize";
import { createAlert } from "@/lib/safety/alerts";
import { checkMessage } from "@/lib/safety/check";
import { crisisResponse } from "@/lib/safety/crisis";
import { activeScenarios, matchScenarios } from "@/lib/scenarios";
import { getSetting } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

const bodySchema = z.union([
  z.object({
    conversationId: z.uuid().nullable(),
    message: z.string().trim().min(1).max(2000),
  }),
  // Mây chủ động mở lời ở cuộc trò chuyện mới (sau check-in / đến hạn hỏi thăm)
  z.object({ opener: z.literal(true) }),
]);

const HISTORY_LIMIT = 20;
const MAX_MESSAGES_PER_MINUTE = 8;
/** Số vòng gọi công cụ tối đa trong một lượt trả lời. */
const MAX_TOOL_ROUNDS = 3;

const TIME = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
const DATE = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });

type Admin = ReturnType<typeof createAdminClient>;
type Send = (event: ChatEvent) => void;
type History = { role: "user" | "assistant"; content: string }[];

/**
 * Nhận tin nhắn của học sinh, kiểm tra an toàn, rồi trả lời dạng stream
 * (mỗi dòng là một ChatEvent dạng JSON).
 *
 * Tin nhắn được ghi bằng quyền server (không phải quyền học sinh) để học sinh
 * không thể tự sửa cờ an toàn. Quyền sở hữu cuộc trò chuyện được kiểm tra ở đây.
 */
export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.locked_at) return Response.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  if (profile.role !== "student") {
    return Response.json({ error: "Trò chuyện với Mây chỉ dành cho học sinh." }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Tin nhắn chưa hợp lệ." }, { status: 400 });

  const admin = createAdminClient();
  if ("opener" in parsed.data) return openConversation(profile, admin);
  const { message } = parsed.data;

  // Giới hạn tốc độ đơn giản để tránh spam / tốn chi phí AI
  const { count } = await admin
    .from("messages")
    .select("id, conversations!inner(user_id)", { count: "exact", head: true })
    .eq("conversations.user_id", profile.id)
    .eq("role", "user")
    .gte("created_at", new Date(Date.now() - 60_000).toISOString());
  if ((count ?? 0) >= MAX_MESSAGES_PER_MINUTE) {
    return Response.json(
      { error: "Bạn nhắn hơi nhanh rồi, Mây theo không kịp. Đợi một chút nhé." },
      { status: 429 },
    );
  }

  // Lấy (hoặc tạo) cuộc trò chuyện của chính học sinh này
  let conversationId = parsed.data.conversationId;
  let history: History = [];
  if (conversationId) {
    const { data: conv } = await admin
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", profile.id)
      .maybeSingle();
    if (!conv) return Response.json({ error: "Không tìm thấy cuộc trò chuyện." }, { status: 404 });

    const { data: rows } = await admin
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT);
    history = (rows ?? []).reverse() as History;
  } else {
    const { data: conv, error } = await admin
      .from("conversations")
      .insert({ user_id: profile.id, title: titleFrom(message) })
      .select("id")
      .single();
    if (error || !conv) return Response.json({ error: "Chưa tạo được cuộc trò chuyện." }, { status: 500 });
    conversationId = conv.id as string;
  }

  const { data: userMsg, error: insertError } = await admin
    .from("messages")
    .insert({ conversation_id: conversationId, role: "user", content: message })
    .select("id")
    .single();
  if (insertError || !userMsg) {
    return Response.json({ error: "Chưa gửi được tin nhắn." }, { status: 500 });
  }

  const safety = await checkMessage(message, history);
  const convId = conversationId;

  return ndjson(async (send) => {
    send({ type: "meta", conversationId: convId });

    let teacherNotified = false;
    if (safety.level !== "none") {
      await admin.from("messages").update({ flagged: true }).eq("id", userMsg.id);
      teacherNotified = await createAlert({
        profile,
        type: "chat_risk",
        severity: safety.level === "urgent" ? "urgent" : "watch",
        excerpt: message,
        reasons: safety.reasons,
      });
    }

    // Mức nguy hiểm: KHÔNG để AI tự trả lời, dùng câu soạn sẵn đã được giáo viên duyệt
    if (safety.level === "urgent") {
      const text = await crisisResponse();
      await admin.from("messages").insert({
        conversation_id: convId,
        role: "assistant",
        content: text,
        is_crisis_response: true,
      });
      await touch(admin, convId);
      send({ type: "crisis", text });
      send({ type: "support", teacherNotified });
      return;
    }

    // Lời dặn = nhân vật + luật + kỹ năng + kịch bản theo chủ đề + tài liệu + ghi nhớ
    const [persona, rules, scenarios, knowledge, prefs, length, memories, concerns] = await Promise.all([
      getSetting("ai.persona"),
      getSetting("ai.rules"),
      activeScenarios(),
      searchKnowledge(message),
      getChatPreferences(profile.id),
      chatLength(admin, profile.id),
      getMemories(profile.id),
      getOpenConcerns(profile.id),
    ]);
    const recent = [...history.slice(-2).map((h) => h.content), message].join(" ");
    const instructions = buildCompanionPrompt({ persona, rules: rules.text }, profile.nickname, {
      concern: safety.level === "concern",
      scenarios: matchScenarios(recent, scenarios),
      knowledge,
      preferences: preferencePrompt(prefs),
      length,
      memory: memoryPrompt(memories, concerns),
    });

    const lastAssistant = [...history].reverse().find((h) => h.role === "assistant")?.content;
    const { reply, attachments } = await streamReply(send, {
      instructions,
      input: [...history, { role: "user", content: message }],
      maxTokens: MAX_OUTPUT_TOKENS[length],
      tools: true,
      userId: profile.id,
      lastAssistant,
    });

    const savedId = await saveReply(admin, send, convId, reply, attachments);
    if (safety.level === "concern") send({ type: "support", teacherNotified });
    if (savedId) await sendSuggestions(admin, send, savedId, message, reply);
  });
}

/** Cuộc trò chuyện mới do Mây mở lời: nhắc lần check-in vừa rồi / hỏi thăm điều bận lòng. */
async function openConversation(profile: Profile, admin: Admin) {
  const ctx = await getOpenerContext(profile.id);
  if (!ctx) return Response.json({ error: "Không có gì để Mây mở lời." }, { status: 409 });

  const emotions = (ctx.checkin?.emotions ?? []).map(getEmotion).filter((e) => e !== undefined);
  const title = ctx.checkin
    ? `Sau check-in: ${emotions.map((e) => e.label).join(", ") || "cảm xúc"}`
    : `Mây hỏi thăm: ${ctx.due[0].title}`;
  const insert: Record<string, unknown> = { user_id: profile.id, title: titleFrom(title) };
  if (ctx.checkin) insert.checkin_id = ctx.checkin.id;
  const { data: conv, error } = await admin.from("conversations").insert(insert).select("id").single();
  if (error || !conv) return Response.json({ error: "Chưa tạo được cuộc trò chuyện." }, { status: 500 });
  const convId = conv.id as string;
  // hỏi thăm rồi thì dời lần sau (dù lời mở đầu có lỗi cũng không hỏi dồn)
  await markConcernsAsked(profile.id, ctx.due.map((c) => c.id));

  return ndjson(async (send) => {
    send({ type: "meta", conversationId: convId });
    const [persona, rules, length, memories, concerns] = await Promise.all([
      getSetting("ai.persona"),
      getSetting("ai.rules"),
      chatLength(admin, profile.id),
      getMemories(profile.id),
      getOpenConcerns(profile.id),
    ]);
    const instructions =
      buildCompanionPrompt({ persona, rules: rules.text }, profile.nickname, {
        length,
        memory: memoryPrompt(memories, concerns),
      }) +
      openerPrompt({
        checkin: ctx.checkin
          ? { emotions: emotions.map((e) => `${e.label} ${e.emoji}`), time: TIME.format(new Date(ctx.checkin.created_at)) }
          : null,
        concerns: ctx.due.map((c) => ({ title: c.title, intensity: c.intensity, date: DATE.format(new Date(c.created_at)) })),
      });

    const { reply } = await streamReply(send, {
      instructions,
      input: [{ role: "developer", content: "Bạn ấy vừa mở cuộc trò chuyện. Hãy mở lời theo lời dặn." }],
      maxTokens: MAX_OUTPUT_TOKENS.long,
      tools: false,
      userId: profile.id,
    });
    const savedId = await saveReply(admin, send, convId, reply, []);
    if (savedId) await sendSuggestions(admin, send, savedId, "", reply);
  });
}

/**
 * Gọi model và stream câu trả lời. Nếu Mây gọi công cụ (ghi nhớ, lưu điều bận lòng,
 * gợi ý bài tập) thì chạy công cụ, gửi thẻ về trình duyệt, rồi cho Mây viết tiếp.
 */
async function streamReply(
  send: Send,
  opts: {
    instructions: string;
    input: ResponseInputItem[];
    maxTokens: number;
    tools: boolean;
    userId: string;
    lastAssistant?: string;
  },
): Promise<{ reply: string; attachments: ChatAttachment[] }> {
  let reply = "";
  const attachments: ChatAttachment[] = [];
  let input = opts.input;
  const model = await chatModel();
  const started = Date.now();

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await openai().responses.create({
        model,
        instructions: opts.instructions,
        input,
        ...(opts.tools
          ? { tools: MAY_TOOLS, tool_choice: round === MAX_TOOL_ROUNDS - 1 ? ("none" as const) : ("auto" as const) }
          : {}),
        include: ["reasoning.encrypted_content"],
        reasoning: { effort: "low" },
        max_output_tokens: opts.maxTokens,
        store: false,
        stream: true,
      });

      let output: ResponseInputItem[] = [];
      let firstDelta = true;
      for await (const event of response) {
        if (event.type === "response.output_text.delta") {
          // đoạn viết tiếp sau khi dùng công cụ: tách đoạn cho dễ đọc
          const text = firstDelta && reply && !/\s$/.test(reply) ? `\n\n${event.delta}` : event.delta;
          firstDelta = false;
          reply += text;
          send({ type: "delta", text });
        } else if (event.type === "response.completed") {
          output = event.response.output as ResponseInputItem[];
          void logAi({
            kind: "chat",
            model,
            ok: true,
            latencyMs: Date.now() - started,
            inputTokens: event.response.usage?.input_tokens,
            outputTokens: event.response.usage?.output_tokens,
          });
        }
      }

      const calls = output.filter((o) => o.type === "function_call");
      if (!calls.length) break;
      const results: ResponseInputItem[] = [];
      for (const call of calls) {
        const result = await runMayTool(call.name, call.arguments, { userId: opts.userId, lastAssistant: opts.lastAssistant });
        if (result.attachment) {
          attachments.push(result.attachment);
          send({ type: "attachment", item: result.attachment });
        }
        results.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result.output) });
      }
      input = [...input, ...output, ...results];
    }
  } catch (error) {
    console.error("[F-Mood] OpenAI lỗi", error);
    void logAi({ kind: "chat", model, ok: false, latencyMs: Date.now() - started, error: String(error) });
    send({ type: "error", message: "Mây đang hơi mệt nên chưa trả lời được. Bạn thử gửi lại sau ít phút nhé." });
  }
  return { reply, attachments };
}

async function saveReply(
  admin: Admin,
  send: Send,
  conversationId: string,
  reply: string,
  attachments: ChatAttachment[],
): Promise<string | null> {
  let savedId: string | null = null;
  if (reply.trim()) {
    const row: Record<string, unknown> = { conversation_id: conversationId, role: "assistant", content: reply };
    if (attachments.length) row.attachments = attachments;
    const { data: saved } = await admin.from("messages").insert(row).select("id").single();
    savedId = saved?.id ?? null;
    if (savedId) send({ type: "saved", messageId: savedId });
  }
  await touch(admin, conversationId);
  return savedId;
}

/** Gợi ý trả lời nhanh cho lượt tiếp theo (câu trả lời đã hiện xong rồi mới tạo). */
async function sendSuggestions(admin: Admin, send: Send, messageId: string, lastUser: string, reply: string) {
  const items = await generateSuggestions(lastUser, reply);
  if (items.length) {
    await admin.from("messages").update({ suggestions: items }).eq("id", messageId);
    send({ type: "suggestions", items });
  }
}

async function chatLength(admin: Admin, userId: string): Promise<ChatLength> {
  // chưa chạy migration 0007 thì không có cột này: dùng mức "vừa"
  const { data } = await admin.from("profiles").select("chat_length").eq("id", userId).maybeSingle();
  return isChatLength(data?.chat_length) ? data.chat_length : "medium";
}

function ndjson(run: (send: Send) => Promise<void>): Response {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send: Send = (event) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        await run(send);
      } finally {
        send({ type: "done" });
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function titleFrom(message: string): string {
  const oneLine = message.replace(/\s+/g, " ").trim();
  return oneLine.length > 48 ? `${oneLine.slice(0, 47)}…` : oneLine;
}

async function touch(admin: Admin, conversationId: string) {
  await admin.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
}
