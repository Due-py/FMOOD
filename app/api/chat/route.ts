import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { logAi } from "@/lib/ai/log";
import { chatModel, openai } from "@/lib/ai/openai";
import { buildCompanionPrompt } from "@/lib/ai/prompts";
import type { ChatEvent } from "@/lib/chat-events";
import { createAlert } from "@/lib/safety/alerts";
import { checkMessage, CLASSIFIER_DOWN_REASON, keywordLayer, type SafetyResult } from "@/lib/safety/check";
import { maxLevel } from "@/lib/safety/keywords";
import { crisisResponse } from "@/lib/safety/crisis";
import { crisisWithStatus } from "@/lib/safety/crisis-text";
import { BLOCKED_REPLY, guardReply, lastSentenceEnd, type GuardReason } from "@/lib/safety/reply-guard";
import { generateSuggestions } from "@/lib/ai/suggestions";
import { searchKnowledge } from "@/lib/kb";
import { getChatPreferences, preferencePrompt } from "@/lib/personalize";
import { activeScenarios, matchScenarios } from "@/lib/scenarios";
import { getSetting } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { contentForProfile } from "@/lib/support-content-server";
import type { SupportItem } from "@/lib/support-content";
import { guessTopic } from "@/lib/topic-guess";

export const maxDuration = 60;

const bodySchema = z.object({
  conversationId: z.uuid().nullable(),
  message: z.string().trim().min(1).max(2000),
  /** chuyện bận lòng học sinh vừa lưu rồi mở trò chuyện để kể thêm */
  worryId: z.uuid().nullable().optional(),
});

const HISTORY_LIMIT = 20;
const MAX_MESSAGES_PER_MINUTE = 8;

type Admin = ReturnType<typeof createAdminClient>;
type Send = (event: ChatEvent) => void;
type Turn = { role: "user" | "assistant"; content: string };

/**
 * Nhận tin nhắn của học sinh, kiểm tra an toàn, rồi trả lời dạng stream
 * (mỗi dòng là một ChatEvent dạng JSON).
 *
 * Tin nhắn được ghi bằng quyền server (không phải quyền học sinh) để học sinh
 * không thể tự sửa cờ an toàn. Quyền sở hữu cuộc trò chuyện được kiểm tra ở đây.
 *
 * Cho nhanh mà vẫn an toàn: AI bắt đầu soạn câu trả lời CÙNG LÚC với kiểm tra an toàn,
 * nhưng câu trả lời bị GIỮ LẠI trên máy chủ cho tới khi có kết quả kiểm tra:
 *  - bình thường → gửi phần đã soạn và viết tiếp
 *  - đáng lo     → bỏ bản nháp, soạn lại theo lời dặn "đáng lo"
 *  - nguy hiểm   → bỏ bản nháp, chỉ gửi câu trả lời soạn sẵn
 * Từ khóa đã rõ là nguy hiểm thì gửi ngay câu soạn sẵn, không chờ AI.
 */
export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.locked_at) return Response.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  if (profile.role !== "student") {
    return Response.json({ error: "Trò chuyện với Mây chỉ dành cho học sinh." }, { status: 403 });
  }
  if (profile.must_change_password) {
    return Response.json({ error: "Bạn cần đặt mật khẩu mới trước." }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Tin nhắn chưa hợp lệ." }, { status: 400 });
  const { message, worryId } = parsed.data;

  const admin = createAdminClient();

  // Đếm tin gần đây, kiểm tra cuộc trò chuyện, lớp từ khóa và chủ đề vòng hỗ trợ: chạy cùng lúc
  const [count, existing, keyword, topics] = await Promise.all([
    recentMessageCount(admin, profile.id),
    parsed.data.conversationId ? loadConversation(admin, parsed.data.conversationId, profile.id) : null,
    keywordLayer(message),
    contentForProfile(profile, ["topic"]),
  ]);
  const worry = worryId ? await loadWorry(admin, worryId, profile.id, topics) : null;
  // Giới hạn tốc độ đơn giản để tránh spam / tốn chi phí AI
  if (count >= MAX_MESSAGES_PER_MINUTE) {
    return Response.json(
      { error: "Bạn nhắn hơi nhanh rồi, Mây theo không kịp. Đợi một chút nhé." },
      { status: 429 },
    );
  }

  // Lấy (hoặc tạo) cuộc trò chuyện của chính học sinh này
  let conversationId: string;
  let history: Turn[] = [];
  let afterCrisis = false;
  if (parsed.data.conversationId) {
    if (!existing) return Response.json({ error: "Không tìm thấy cuộc trò chuyện." }, { status: 404 });
    conversationId = parsed.data.conversationId;
    history = existing.history;
    afterCrisis = existing.afterCrisis;
  } else {
    const { data: conv, error } = await admin
      .from("conversations")
      .insert({ user_id: profile.id, title: titleFrom(message) })
      .select("id")
      .single();
    if (error || !conv) return Response.json({ error: "Chưa tạo được cuộc trò chuyện." }, { status: 500 });
    conversationId = conv.id as string;
  }

  // Từ khóa đã rõ là nguy hiểm thì không cần chờ AI phân loại.
  // Lỗi bất ngờ khi kiểm tra: không chắc thì coi là "cần để ý", không bao giờ là "ổn".
  const safetyPromise: Promise<SafetyResult> =
    keyword.level === "urgent"
      ? Promise.resolve(keyword)
      : checkMessage(message, history).catch((error) => {
          console.error("[F-Mood] Kiểm tra an toàn lỗi", error);
          return { level: maxLevel(keyword.level, "concern"), reasons: [...keyword.reasons, CLASSIFIER_DOWN_REASON] };
        });

  const { data: userMsg, error: insertError } = await admin
    .from("messages")
    .insert({ conversation_id: conversationId, role: "user", content: message })
    .select("id")
    .single();
  if (insertError || !userMsg) {
    return Response.json({ error: "Chưa gửi được tin nhắn." }, { status: 500 });
  }
  const convId = conversationId;

  return ndjson(async (send) => {
    send({ type: "meta", conversationId: convId });

    // Bắt đầu soạn câu trả lời ngay (giữ lại, chưa gửi). Cuộc trò chuyện vừa có lúc nguy hiểm
    // hoặc từ khóa báo đáng lo thì soạn luôn theo lời dặn "đáng lo".
    const startGentle = afterCrisis || keyword.level === "concern";
    let draft = keyword.level === "urgent" ? null : startReply(profile.nickname, profile.id, message, history, startGentle, worry);

    const safety = await safetyPromise;

    // Cảnh báo cho thầy cô (chạy song song với phần trả lời)
    const alerted: Promise<boolean> =
      safety.level === "none"
        ? Promise.resolve(false)
        : Promise.all([
            admin.from("messages").update({ flagged: true }).eq("id", userMsg.id),
            createAlert({
              profile,
              type: "chat_risk",
              severity: safety.level === "urgent" ? "urgent" : "watch",
              excerpt: message,
              reasons: safety.reasons,
            }),
          ]).then(([, ok]) => ok);

    // Mức nguy hiểm: KHÔNG để AI tự trả lời, dùng câu soạn sẵn đã được giáo viên duyệt.
    // Chờ ghi cảnh báo xong để câu trả lời nói đúng thầy cô đã được báo hay chưa (QT11).
    if (safety.level === "urgent") {
      draft?.cancel();
      const [message, notified] = await Promise.all([crisisResponse(), alerted]);
      const text = crisisWithStatus(message, notified);
      send({ type: "crisis", text });
      await admin.from("messages").insert({
        conversation_id: convId,
        role: "assistant",
        content: text,
        is_crisis_response: true,
      });
      await touch(admin, convId);
      send({ type: "support", teacherNotified: notified });
      return;
    }

    const gentle = safety.level === "concern" || afterCrisis;
    if (!draft || draft.gentle !== gentle) {
      draft?.cancel();
      draft = startReply(profile.nickname, profile.id, message, history, gentle, worry);
    }
    // đã qua kiểm tra an toàn: gửi phần đã soạn và phần còn lại
    const reply = await draft.release(send);

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
    if (gentle) send({ type: "support", teacherNotified: await alerted });
    else await alerted;

    // Mây đoán chủ đề (không gọi AI) khi cuộc trò chuyện chưa gắn với chuyện bận lòng nào;
    // trình duyệt hỏi "Có phải bạn đang lo chuyện…?" tối đa một lần mỗi cuộc trò chuyện
    if (savedId && !worry) {
      const key = guessTopic(
        message,
        topics.map((t) => ({ key: t.topic as string, triggers: (t.data.triggers as string[]) ?? [] })),
      );
      const topic = topics.find((t) => t.topic === key);
      if (topic) send({ type: "topic_guess", topic: key as string, label: String(topic.data.label), emoji: String(topic.data.emoji) });
    }

    // gợi ý trả lời nhanh cho lượt tiếp theo (câu trả lời đã hiện xong, học sinh nhắn tiếp được ngay)
    if (savedId) {
      const items = await generateSuggestions(message, reply);
      if (items.length) {
        await admin.from("messages").update({ suggestions: items }).eq("id", savedId);
        send({ type: "suggestions", items });
      }
    }
  });
}

/**
 * Bắt đầu soạn câu trả lời. Chữ AI viết ra được giữ trong bộ đệm cho tới khi gọi
 * release(): lúc đó gửi phần đã có rồi gửi tiếp phần còn lại. cancel() bỏ bản nháp.
 *
 * Kiểm tra câu trả lời trước khi hiện (guardReply): chữ được gửi theo TỪNG CÂU đã hoàn chỉnh,
 * mỗi lần gửi đều kiểm tra toàn bộ phần đã viết. Gặp câu sai (hứa đã báo thầy cô, chẩn đoán...)
 * thì ngừng gửi, thay cả câu trả lời bằng BLOCKED_REPLY và chỉ lưu câu thay thế.
 */
function startReply(
  nickname: string,
  userId: string,
  message: string,
  history: Turn[],
  gentle: boolean,
  worry: { topicLabel: string; level: number } | null,
) {
  const abort = new AbortController();
  let out = null as Send | null;
  let failed = false as boolean;
  let reply = "";
  let sent = 0;
  let blocked: GuardReason[] | null = null;

  // gửi phần đã viết tới hết câu cuối (final: gửi nốt), sau khi kiểm tra
  const flush = (final: boolean) => {
    if (!out || blocked) return;
    const end = final ? reply.length : lastSentenceEnd(reply);
    if (end <= sent) return;
    const check = guardReply(reply.slice(0, end));
    if (!check.ok) {
      blocked = check.reasons;
      return;
    }
    out({ type: "delta", text: reply.slice(sent, end) });
    sent = end;
  };

  const done = (async () => {
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
        getChatPreferences(userId),
      ]);
      model = chosenModel;
      const recent = [...history.slice(-2).map((h) => h.content), message].join(" ");
      const instructions = buildCompanionPrompt({ persona, rules: rules.text }, nickname, {
        concern: gentle,
        scenarios: matchScenarios(recent, scenarios),
        knowledge,
        preferences: preferencePrompt(prefs),
        worry: worry ?? undefined,
      });

      const response = await openai().responses.create(
        {
          model,
          instructions,
          input: [...history, { role: "user" as const, content: message }],
          reasoning: { effort: "low" },
          max_output_tokens: 1200,
          store: false,
          stream: true,
        },
        { signal: abort.signal },
      );
      for await (const event of response) {
        if (event.type === "response.output_text.delta") {
          reply += event.delta;
          flush(false);
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
      if (abort.signal.aborted) return "";
      console.error("[F-Mood] OpenAI lỗi", error);
      void logAi({ kind: "chat", model, ok: false, latencyMs: Date.now() - started, error: String(error) });
      failed = true;
    }
    return reply;
  })();

  return {
    gentle,
    cancel: () => abort.abort(),
    async release(send: Send): Promise<string> {
      // gửi phần đã soạn, rồi cho phần sau gửi tiếp theo từng câu (cùng một lượt chạy nên không lẫn thứ tự)
      out = send;
      flush(false);
      await done;
      flush(true);
      if (blocked) {
        console.warn("[F-Mood] Đã chặn câu trả lời của Mây", blocked);
        send({ type: "replace", text: BLOCKED_REPLY });
        return BLOCKED_REPLY;
      }
      if (failed) {
        send({
          type: "error",
          message: "Mây đang hơi mệt nên chưa trả lời được. Bạn thử gửi lại sau ít phút nhé.",
        });
      }
      return reply;
    },
  };
}

async function recentMessageCount(admin: Admin, userId: string): Promise<number> {
  const { count } = await admin
    .from("messages")
    .select("id, conversations!inner(user_id)", { count: "exact", head: true })
    .eq("conversations.user_id", userId)
    .eq("role", "user")
    .gte("created_at", new Date(Date.now() - 60_000).toISOString());
  return count ?? 0;
}

/**
 * Cuộc trò chuyện của CHÍNH học sinh này (kèm các tin gần nhất), hoặc null.
 * Hai truy vấn chạy cùng lúc; tin nhắn chỉ được dùng khi đã xác nhận đúng chủ.
 */
async function loadConversation(admin: Admin, conversationId: string, userId: string) {
  const [{ data: conv }, { data: rows }] = await Promise.all([
    admin.from("conversations").select("id").eq("id", conversationId).eq("user_id", userId).maybeSingle(),
    admin
      .from("messages")
      .select("role, content, is_crisis_response")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT),
  ]);
  if (!conv) return null;
  const recent = rows ?? [];
  return {
    history: recent.reverse().map((r) => ({ role: r.role, content: r.content }) as Turn),
    // trong các tin gần đây Mây đã phải dùng câu trả lời soạn sẵn
    afterCrisis: recent.some((r) => r.is_crisis_response),
  };
}

/** Chuyện bận lòng của CHÍNH học sinh này (còn đang theo dõi), kèm tên chủ đề. */
async function loadWorry(admin: Admin, worryId: string, userId: string, topics: SupportItem[]) {
  const { data } = await admin
    .from("worries")
    .select("topic, level_now")
    .eq("id", worryId)
    .eq("user_id", userId)
    .in("status", ["open", "better"])
    .maybeSingle();
  if (!data) return null;
  const topic = topics.find((t) => t.topic === data.topic);
  return { topicLabel: topic ? String(topic.data.label) : String(data.topic), level: data.level_now as number };
}

function ndjson(run: (send: Send) => Promise<void>): Response {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send: Send = (event) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        await run(send);
      } catch (error) {
        console.error("[F-Mood] Lỗi khi trả lời", error);
        send({ type: "error", message: "Có lỗi xảy ra. Bạn thử gửi lại nhé." });
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
