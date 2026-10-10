import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { logAi } from "@/lib/ai/log";
import { chatModel, openai } from "@/lib/ai/openai";
import { buildCompanionPrompt } from "@/lib/ai/prompts";
import type { ChatEvent } from "@/lib/chat-events";
import { createAlert } from "@/lib/safety/alerts";
import { checkMessage } from "@/lib/safety/check";
import { crisisResponse } from "@/lib/safety/crisis";
import { generateSuggestions } from "@/lib/ai/suggestions";
import { searchKnowledge } from "@/lib/kb";
import { getChatPreferences, preferencePrompt } from "@/lib/personalize";
import { activeScenarios, matchScenarios } from "@/lib/scenarios";
import { getSetting } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

const bodySchema = z.object({
  conversationId: z.uuid().nullable(),
  message: z.string().trim().min(1).max(2000),
});

const HISTORY_LIMIT = 20;
const MAX_MESSAGES_PER_MINUTE = 8;

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
  const { message } = parsed.data;

  const admin = createAdminClient();

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
  let history: { role: "user" | "assistant"; content: string }[] = [];
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
    history = (rows ?? []).reverse() as typeof history;
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

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: ChatEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

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
        send({ type: "done" });
        controller.close();
        return;
      }

      let reply = "";
      const started = Date.now();
      let model = "";
      try {
        // Lời dặn = nhân vật + luật + kịch bản theo chủ đề + tài liệu tham khảo
        const [persona, rules, scenarios, knowledge, chosenModel, prefs] = await Promise.all([
          getSetting("ai.persona"),
          getSetting("ai.rules"),
          activeScenarios(),
          searchKnowledge(message),
          chatModel(),
          getChatPreferences(profile.id),
        ]);
        model = chosenModel;
        const recent = [...history.slice(-2).map((h) => h.content), message].join(" ");
        const instructions = buildCompanionPrompt({ persona, rules: rules.text }, profile.nickname, {
          concern: safety.level === "concern",
          scenarios: matchScenarios(recent, scenarios),
          knowledge,
          preferences: preferencePrompt(prefs),
        });

        const response = await openai().responses.create({
          model,
          instructions,
          input: [...history, { role: "user" as const, content: message }],
          reasoning: { effort: "low" },
          max_output_tokens: 1200,
          store: false,
          stream: true,
        });
        for await (const event of response) {
          if (event.type === "response.output_text.delta") {
            reply += event.delta;
            send({ type: "delta", text: event.delta });
          } else if (event.type === "response.completed") {
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
      } catch (error) {
        console.error("[F-Mood] OpenAI lỗi", error);
        void logAi({ kind: "chat", model, ok: false, latencyMs: Date.now() - started, error: String(error) });
        send({
          type: "error",
          message: "Mây đang hơi mệt nên chưa trả lời được. Bạn thử gửi lại sau ít phút nhé.",
        });
      }

      let savedId: string | null = null;
      if (reply.trim()) {
        const { data: saved } = await admin
          .from("messages")
          .insert({ conversation_id: convId, role: "assistant", content: reply })
          .select("id")
          .single();
        savedId = saved?.id ?? null;
        if (savedId) send({ type: "saved", messageId: savedId });
      }
      await touch(admin, convId);
      if (safety.level === "concern") send({ type: "support", teacherNotified });

      // gợi ý trả lời nhanh cho lượt tiếp theo (câu trả lời đã hiện xong rồi mới tạo)
      if (savedId) {
        const items = await generateSuggestions(message, reply);
        if (items.length) {
          await admin.from("messages").update({ suggestions: items }).eq("id", savedId);
          send({ type: "suggestions", items });
        }
      }
      send({ type: "done" });
      controller.close();
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

async function touch(admin: ReturnType<typeof createAdminClient>, conversationId: string) {
  await admin.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
}
