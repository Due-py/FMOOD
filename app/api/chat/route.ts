import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { isTestOnlyClass } from "@/lib/bai-do-server";
import { logAi } from "@/lib/ai/log";
import { chatModel, openai } from "@/lib/ai/openai";
import { buildCompanionPrompt, type TurnMode, type WorryContext } from "@/lib/ai/prompts";
import { getPromptConfig } from "@/lib/ai/prompt-config";
import { CHARACTERS, LENGTH_CAPS, type ChatStyle } from "@/lib/ai/chat-style";
import { CARD_KINDS, isCardLine, parseReplyCards, stripCardLines } from "@/lib/ai/reply-cards";
import { studentStyle } from "@/lib/assistant";
import { summarizeDifficulty } from "@/lib/ai/summary";
import type { ChatEvent } from "@/lib/chat-events";
import { createAlert } from "@/lib/safety/alerts";
import { checkMessage, CLASSIFIER_DOWN_REASON, keywordLayer, type SafetyResult } from "@/lib/safety/check";
import { maxLevel } from "@/lib/safety/keywords";
import { crisisResponse } from "@/lib/safety/crisis";
import { crisisWithStatus } from "@/lib/safety/crisis-text";
import { blockedReplyFor, guardReply, lastSentenceEnd, type GuardReason } from "@/lib/safety/reply-guard";
import { generateSuggestions } from "@/lib/ai/suggestions";
import { searchKnowledge } from "@/lib/kb";
import { getChatPreferences, preferencePrompt } from "@/lib/personalize";
import { activeScenarios, matchScenarios } from "@/lib/scenarios";
import { logActivity } from "@/lib/activity-log";
import { CONVERSATION_SOURCES } from "@/lib/chat-source";
import { createAdminClient } from "@/lib/supabase/admin";
import { contentForProfile } from "@/lib/support-content-server";
import type { SupportItem } from "@/lib/support-content";
import { guessTopic } from "@/lib/topic-guess";
import { dayKey } from "@/lib/dates";
import { chatRestToday } from "@/lib/chat-rest-server";
import { lessonHelpPrompt, type LessonContext } from "@/lib/ai/lesson-help";
import { getLesson } from "@/lib/lessons";
import { SKIP_MESSAGE } from "@/lib/chat-loop";
import { EMPTY_STATE, maxQuestions, moveInstruction, parseState, selStep, SKILL_CARD_MOVES, type SelMove, type SelState } from "@/lib/sel/engine";
import { limitQuestions, questionCutAt } from "@/lib/sel/questions";
import { engineAllowed, needsClassifier, replyPath } from "@/lib/sel/turn-path";
import { checkinContext, freshCheckin } from "@/lib/checkin-context";
import { journalContext } from "@/lib/journal-shared";
import { getSetting } from "@/lib/settings";
import { actionsDoneFor, difficultiesOf } from "@/lib/worries";
import { DIFFICULTY_MAX, isTried, type Tried } from "@/lib/worries-shared";

export const maxDuration = 60;

const bodySchema = z.object({
  conversationId: z.uuid().nullable(),
  message: z.string().trim().min(1).max(2000),
  /** chuyện bận lòng học sinh vừa lưu rồi mở trò chuyện để kể thêm */
  worryId: z.uuid().nullable().optional(),
  /** nút học sinh vừa bấm: "… hiểu chưa đúng" (correction) hoặc "Bỏ qua" (skip) */
  turn: z.enum(["correction", "skip"]).nullable().optional(),
  /** trình duyệt muốn trợ lý tóm tắt khó khăn để học sinh xác nhận (sau 1–2 lượt kể, hoặc sau khi sửa) */
  wantSummary: z.boolean().optional(),
  /** khó khăn học sinh đã bấm "Đúng rồi" khi cuộc trò chuyện chưa gắn chuyện bận lòng nào (lời của học sinh) */
  difficulty: z.string().trim().min(4).max(DIFFICULTY_MAX).nullable().optional(),
  /** cuộc trò chuyện mới bắt đầu từ đâu (Tổng quan app); chỉ dùng khi tạo cuộc trò chuyện */
  source: z.enum(CONVERSATION_SOURCES).nullable().optional(),
  /** mở từ nút "Hỏi …" của một bài tập (mục 5.3): máy chủ tự đọc tên bài và đề, không nhận chữ từ trình duyệt */
  lesson: z.object({ slug: z.string().trim().min(1).max(120), exerciseId: z.string().regex(/^e\d{1,2}$/) }).nullable().optional(),
  /** mở từ một trang nhật ký (học sinh đã bấm đồng ý cho trợ lý đọc): máy chủ tự đọc trang của chính học sinh */
  journalId: z.uuid().nullable().optional(),
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
    return Response.json({ error: "Trò chuyện chỉ dành cho học sinh." }, { status: 403 });
  }
  if (profile.must_change_password) {
    return Response.json({ error: "Bạn cần đặt mật khẩu mới trước." }, { status: 403 });
  }
  // lớp "chỉ làm bài đo" (lớp so sánh) không dùng trợ lý
  if (await isTestOnlyClass(profile.class_id)) {
    return Response.json({ error: "Lớp của bạn hiện chỉ làm bài đo." }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Tin nhắn chưa hợp lệ." }, { status: 400 });
  const { message, worryId } = parsed.data;
  const turn: TurnMode | undefined = parsed.data.turn ?? undefined;

  const admin = createAdminClient();

  // Đếm tin gần đây, kiểm tra cuộc trò chuyện, lớp từ khóa, chủ đề vòng hỗ trợ và lựa chọn trò chuyện của học sinh
  // (nhân vật, độ dài…; đổi lúc nào thì áp dụng từ tin nhắn tiếp theo): chạy cùng lúc
  const [count, existing, keyword, topics, style] = await Promise.all([
    recentMessageCount(admin, profile.id),
    parsed.data.conversationId ? loadConversation(admin, parsed.data.conversationId, profile.id) : null,
    keywordLayer(message),
    contentForProfile(profile, ["topic", "tiny_action"]),
    studentStyle(profile.id),
  ]);
  const name = CHARACTERS[style.character].name;
  const loaded = worryId ? await loadWorry(admin, worryId, profile.id, topics) : null;
  // chưa gắn chuyện bận lòng mà học sinh đã xác nhận khó khăn trong cuộc trò chuyện này: vẫn dùng câu đó
  const worry: WorryContext | null =
    loaded ?? (parsed.data.difficulty ? { topicLabel: null, level: null, difficulty: parsed.data.difficulty } : null);
  // Giới hạn tốc độ đơn giản để tránh spam / tốn chi phí AI
  if (count >= MAX_MESSAGES_PER_MINUTE) {
    return Response.json(
      { error: `Bạn nhắn hơi nhanh rồi, ${name} theo không kịp. Đợi một chút nhé.` },
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
    const row = { user_id: profile.id, title: titleFrom(message) };
    let { data: conv, error } = await admin
      .from("conversations")
      .insert({ ...row, source: parsed.data.source ?? "other" })
      .select("id")
      .single();
    // chưa chạy migration 0019 (chưa có cột nguồn) hoặc 0024 (chưa có nguồn "journal"): tạo như bản cũ
    if (error?.code === "42703" || error?.code === "PGRST204" || error?.code === "23514") ({ data: conv, error } = await admin.from("conversations").insert(row).select("id").single());
    if (error || !conv) return Response.json({ error: "Chưa tạo được cuộc trò chuyện." }, { status: 500 });
    conversationId = conv.id as string;
    logActivity(profile, "chat_start");
  }

  // Từ khóa đã rõ là nguy hiểm thì không cần chờ AI phân loại.
  // Lỗi bất ngờ khi kiểm tra: không chắc thì coi là "cần để ý", không bao giờ là "ổn".
  // Lượt bấm "Bỏ qua" gửi câu soạn sẵn (SKIP_MESSAGE), không phải lời học sinh: không chấm lại (chấm lại sẽ đọc bối cảnh
  // lượt trước và tạo thêm cảnh báo trùng). Lượt "… hiểu chưa đúng" có lời học sinh tự viết nên vẫn chấm.
  // Các đường đi của một lượt (và test cho chúng): lib/sel/turn-path.ts
  const safetyPromise: Promise<SafetyResult> = !needsClassifier(keyword.level, turn, message === SKIP_MESSAGE)
    ? Promise.resolve(keyword)
    : checkMessage(message, plain(history)).catch((error) => {
        console.error("[F-Mood] Kiểm tra an toàn lỗi", error);
        return { level: maxLevel(keyword.level, "concern"), reasons: [...keyword.reasons, CLASSIFIER_DOWN_REASON] };
      });

  // Bộ điều phối SEL (lib/sel/engine.ts): công tắc admin và trạng thái đã lưu của cuộc trò chuyện, đọc song song
  const enginePromise = getSetting("sel.engine").then((v) => v.enabled).catch(() => false);
  // mở trò chuyện ngay sau check-in: cảm xúc bạn ấy vừa tự chọn đi vào lời dặn (lượt đầu) và trạng thái SEL (lib/checkin-context.ts)
  const checkin = !parsed.data.conversationId && parsed.data.source === "checkin" ? await recentCheckin(admin, profile.id) : null;
  // mở từ một trang nhật ký: trang đó (lời học sinh, bọc <<< >>>) đi vào lời dặn của lượt đầu
  const journalLine = !parsed.data.conversationId && parsed.data.journalId ? await journalLineFor(admin, profile.id, parsed.data.journalId) : "";
  const selStatePromise: Promise<SelState> = parsed.data.conversationId
    ? loadSelState(admin, conversationId)
    : Promise.resolve(checkin?.emotion ? { ...EMPTY_STATE, known: { emotion: checkin.emotion } } : EMPTY_STATE);

  const { data: userMsg, error: insertError } = await admin
    .from("messages")
    .insert({ conversation_id: conversationId, role: "user", content: message })
    .select("id")
    .single();
  if (insertError || !userMsg) {
    return Response.json({ error: "Chưa gửi được tin nhắn." }, { status: 500 });
  }
  const convId = conversationId;
  // nhật ký đợt thử: chỉ đếm là đã gửi một tin, không ghi nội dung
  logActivity(profile, "chat_message");
  // mục 4.4: thời gian trò chuyện hôm nay, tính từ giờ gửi tin (đã gồm tin vừa gửi); đọc song song với phần trả lời
  const restPromise = chatRestToday(profile.id);
  // mục 5.3: bài tập học sinh đang hỏi (chỉ bài đã đăng); không thấy thì trò chuyện như thường
  const lesson = parsed.data.lesson ? await loadLesson(parsed.data.lesson.slug, parsed.data.lesson.exerciseId) : null;

  return ndjson(async (send) => {
    send({ type: "meta", conversationId: convId });

    // Bắt đầu soạn câu trả lời ngay (giữ lại, chưa gửi). Cuộc trò chuyện vừa có lúc nguy hiểm
    // hoặc từ khóa báo đáng lo thì soạn luôn theo lời dặn "đáng lo".
    const startGentle = afterCrisis || keyword.level === "concern";
    const input: ReplyInput = {
      nickname: profile.nickname,
      userId: profile.id,
      message,
      history,
      worry,
      turn,
      style,
      lesson,
      contextLine: [checkin?.line ?? "", journalLine].filter(Boolean).join("\n\n"),
      selLine: "",
      maxQuestions: 1,
    };
    // Bộ điều phối SEL chỉ chạy ở lượt học sinh tự viết (không ở lượt bấm nút, không khi đang hỏi bài tập).
    // Khi bật, câu trả lời chờ AI nhận diện lượt (cùng lời gọi kiểm tra an toàn) rồi mới soạn theo bước đã chọn.
    const engine = engineAllowed(keyword.level, turn, Boolean(lesson)) && (await enginePromise);
    let draft = keyword.level === "urgent" || engine ? null : startReply(input, startGentle);

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

    // AI phân loại lỗi: mức "đáng lo" (check.ts) nên đi đường đáng lo, không trở về trò chuyện tự do
    const gentle = replyPath({ level: safety.level, afterCrisis, engine, hasSel: Boolean(safety.sel) }) === "dang-lo";
    // chọn bước SEL (quy tắc xác định); lượt đáng lo vẫn ghi bước (gợi ý người lớn) nhưng không thêm dòng "LƯỢT NÀY"
    const sel: { move: SelMove; state: SelState } | null = engine && safety.sel ? selStep(await selStatePromise, safety.sel, safety.level) : null;
    const selLine = sel && !gentle ? moveInstruction(sel.move, sel.state) : "";
    // một câu hỏi mỗi lượt (bước "dừng hỏi": không câu hỏi nào), chặn bằng code trong startReply
    const replyInput: ReplyInput = { ...input, selLine, maxQuestions: sel && !gentle ? maxQuestions(sel.move) : 1 };
    if (!draft || draft.gentle !== gentle) {
      draft?.cancel();
      draft = startReply(replyInput, gentle);
    }
    // đã qua kiểm tra an toàn: gửi phần đã soạn và phần còn lại
    const raw = await draft.release(send);
    // Thẻ gợi ý (GOAL / SKILL / END): lượt đáng lo thì bỏ hết dòng thẻ khỏi tin lưu lại; lượt thường lưu nguyên văn,
    // lúc hiện mới tách thẻ ra (trình duyệt cũng ẩn dòng thẻ trong lúc đang viết)
    // Thẻ kỹ năng (SKILL) chỉ hiện khi đã tới bước chọn cách ứng phó; tắt bộ điều phối thì chỉ cấm ở lượt đầu
    const skillOk = sel ? SKILL_CARD_MOVES.includes(sel.move) : history.length > 0;
    const reply =
      gentle && raw.split("\n").some(isCardLine)
        ? stripCardLines(raw)
        : !skillOk && SKILL_LINE.test(raw)
          ? raw
              .split("\n")
              .filter((l) => !SKILL_LINE.test(l))
              .join("\n")
              .trimEnd()
          : raw;
    // trình duyệt đã nhận bản có dòng thẻ: thay bằng bản đã bỏ (lượt đáng lo, hoặc thẻ kỹ năng chưa tới lúc)
    if (reply !== raw) send({ type: "replace", text: reply });
    const { text: replyText, cards } = parseReplyCards(reply, draft.skills());

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
    // lưu trạng thái SEL (chỉ lời học sinh và mã bước) và ghi mã bước vào nhật ký đợt thử (không ghi nội dung)
    if (sel && reply.trim()) {
      void saveSelState(admin, convId, sel.state);
      logActivity(profile, "sel_step", sel.move);
    }
    // đếm số thẻ đã hiện (chỉ loại thẻ và mã kỹ năng, không ghi nội dung); chưa chạy 0020 thì bỏ qua
    const shown = savedId ? CARD_KINDS.filter((k) => cards[k]).map((k) => (k === "skill" && cards.skill ? `skill:${cards.skill.code}` : k)) : [];
    if (shown.length) {
      void admin
        .from("support_activity")
        .insert(shown.map((ref) => ({ user_id: profile.id, kind: "card_shown", ref, day: dayKey() })))
        .then(({ error }) => error && console.warn("[F-Mood] Ghi thẻ gợi ý lỗi", error.message));
    }
    await touch(admin, convId);
    // HAI TRỤC: mức nguy cơ quyết định báo thầy cô và giọng "đáng lo"; mức căng thẳng nặng (không nguy cơ) chỉ hiện thêm
    // khung "người lắng nghe", không báo ai.
    if (gentle || safety.stress === "nang") send({ type: "support", teacherNotified: await alerted });
    // nhắc nghỉ sau 20 phút trong ngày: chỉ là một dòng nhắc, không khóa ô nhắn hay nút "Cần giúp"
    const rest = await restPromise;
    if (rest.remind) send({ type: "rest", minutes: rest.minutes });
    if (rest.crossed) logActivity(profile, "chat_rest");
    else await alerted;

    // nút học sinh vừa bấm: ghi để đo (chỉ ghi loại nút, không ghi tin nhắn); chưa chạy 0014 thì bỏ qua
    if (turn) {
      void admin
        .from("support_activity")
        .insert({ user_id: profile.id, kind: turn === "correction" ? "misunderstood" : "chat_skip", worry_id: loaded?.id ?? null, day: dayKey() })
        .then(({ error }) => error && console.warn("[F-Mood] Ghi nút trong trò chuyện lỗi", error.message));
    }

    // Trợ lý đoán chủ đề (không gọi AI) khi cuộc trò chuyện chưa gắn với chuyện bận lòng nào;
    // trình duyệt hỏi "Có phải bạn đang lo chuyện…?" tối đa một lần mỗi cuộc trò chuyện
    if (savedId && !worry && !turn) {
      // chỉ dòng "chủ đề": việc nhỏ cũng có cột topic nhưng không có tên / biểu tượng (lấy nhầm thì hiện "undefined")
      const topicRows = topics.filter((t) => t.kind === "topic" && t.topic && t.data.label);
      const key = guessTopic(
        message,
        topicRows.map((t) => ({ key: t.topic as string, triggers: (t.data.triggers as string[]) ?? [] })),
      );
      const topic = topicRows.find((t) => t.topic === key);
      if (topic) send({ type: "topic_guess", topic: key as string, label: String(topic.data.label), emoji: String(topic.data.emoji) });
    }

    // Sau câu trả lời (học sinh nhắn tiếp được ngay): gợi ý trả lời nhanh, và câu tóm tắt khó khăn để học sinh
    // bấm "Đúng rồi" / sửa khi vừa bấm "… hiểu chưa đúng" hoặc đã kể 1–2 lượt (QT03, QT05). Hai việc chạy cùng lúc.
    // Cả hai chỉ đọc câu văn, không đọc dòng thẻ.
    if (savedId) {
      const askSummary = turn === "correction" || parsed.data.wantSummary === true;
      const turns = [...plain(history), { role: "user" as const, content: message }, { role: "assistant" as const, content: replyText }];
      await Promise.all([
        generateSuggestions(message, replyText, plain(history)).then(async (items) => {
          if (!items.length) return;
          await admin.from("messages").update({ suggestions: items }).eq("id", savedId);
          send({ type: "suggestions", items });
        }),
        askSummary
          ? summarizeDifficulty(turns).then((text) => {
              if (text) send({ type: "summary", text });
            })
          : null,
      ]);
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
type ReplyInput = {
  nickname: string;
  userId: string;
  message: string;
  history: Turn[];
  worry: WorryContext | null;
  turn: TurnMode | undefined;
  /** lựa chọn trò chuyện của học sinh: nhân vật, độ dài (giới hạn token đầu ra theo mức), cách dẫn dắt, động lực */
  style: ChatStyle;
  /** bài tập học sinh mở trò chuyện để hỏi (mục 5.3): trợ lý giúp hiểu đề, chuẩn bị câu hỏi, không đưa đáp án */
  lesson: LessonContext | null;
  /** bối cảnh thêm cho lượt này, ví dụ cảm xúc vừa check-in (rỗng: không có) */
  contextLine: string;
  /** dòng "LƯỢT NÀY" của bộ điều phối SEL (rỗng: không có) */
  selLine: string;
  /** số câu hỏi tối đa trong câu trả lời: phần hỏi thêm bị cắt (lib/sel/questions.ts) */
  maxQuestions: number;
};

function startReply({ nickname, userId, message, history, worry, turn, style, lesson, contextLine, selLine, maxQuestions: maxQ }: ReplyInput, gentle: boolean) {
  const abort = new AbortController();
  let out = null as Send | null;
  let failed = false as boolean;
  let reply = "";
  let sent = 0;
  let blocked: GuardReason[] | null = null;
  const recentStudent = [...history.filter((h) => h.role === "user").slice(-3).map((h) => h.content), message].join("\n");
  // vị trí cắt khi câu trả lời hỏi nhiều hơn maxQ câu (-1: chưa cần cắt)
  let cutAt = -1;
  // danh sách kỹ năng trong lời dặn (phần 7): bộ tách thẻ SKILL chỉ nhận đúng các tên này
  let skills: string[] = [];

  // gửi phần đã viết tới hết câu cuối (final: gửi nốt), sau khi kiểm tra
  const flush = (final: boolean) => {
    if (!out || blocked) return;
    if (cutAt === -1) cutAt = questionCutAt(reply, maxQ);
    const end = Math.min(final ? reply.length : lastSentenceEnd(reply), cutAt === -1 ? Infinity : cutAt);
    if (end <= sent) return;
    // có tin nhắn của học sinh: kiểm tra thêm câu trả lời có phải bản làm hộ không (khong-lam-ho).
    // Chỉ kiểm tra câu văn, không kiểm tra dòng thẻ GOAL / SKILL / END.
    // so với cả các lời học sinh gần đây: đòi làm hộ ở lượt trước rồi nài tiếp ở lượt này vẫn bị chặn
    const check = guardReply(stripCardLines(reply.slice(0, end)), recentStudent);
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
      // Lời dặn 9 phần (lib/ai/prompts.ts): phần admin sửa + phong cách học sinh chọn + kịch bản theo chủ đề + tài liệu
      const [config, scenarios, knowledge, chosenModel, prefs] = await Promise.all([
        getPromptConfig(),
        activeScenarios(),
        searchKnowledge(message),
        chatModel(),
        getChatPreferences(userId),
      ]);
      model = chosenModel;
      skills = config.skills;
      const recent = [...history.slice(-2).map((h) => h.content), message].join(" ");
      const instructions = buildCompanionPrompt(config, style, nickname, {
        concern: gentle,
        scenarios: matchScenarios(recent, scenarios),
        knowledge,
        preferences: preferencePrompt(prefs),
        worry: worry ?? undefined,
        turn,
      });
      // mở từ bài tập: thêm tên bài, đề và cách giúp (không đưa đáp án) vào cuối lời dặn
      const withLesson = [instructions, lesson ? lessonHelpPrompt(lesson) : "", contextLine].filter(Boolean).join("\n\n");
      // bước SEL của lượt này (bộ điều phối chọn) đứng cuối để AI làm đúng bước đó
      const fullInstructions = selLine ? `${withLesson}\n\n${selLine}` : withLesson;

      const response = await openai().responses.create(
        {
          model,
          instructions: fullInstructions,
          input: [...history, { role: "user" as const, content: message }],
          reasoning: { effort: "low" },
          // giới hạn theo mức độ dài học sinh chọn (gồm cả phần suy nghĩ của model)
          max_output_tokens: LENGTH_CAPS[style.length].maxOutputTokens,
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
    skills: () => skills,
    cancel: () => abort.abort(),
    async release(send: Send): Promise<string> {
      // gửi phần đã soạn, rồi cho phần sau gửi tiếp theo từng câu (cùng một lượt chạy nên không lẫn thứ tự)
      out = send;
      flush(false);
      await done;
      flush(true);
      if (blocked) {
        console.warn("[F-Mood] Đã chặn câu trả lời của trợ lý", blocked);
        const text = blockedReplyFor(blocked);
        send({ type: "replace", text });
        return text;
      }
      // đã cắt câu hỏi thừa: gửi bản cuối (câu văn tới câu hỏi được phép + dòng thẻ) để trình duyệt thay phần đã hiện
      if (cutAt !== -1 && !failed) {
        const text = limitQuestions(reply, maxQ);
        send({ type: "replace", text });
        return text;
      }
      if (failed) {
        send({
          type: "error",
          message: `${CHARACTERS[style.character].name} đang hơi mệt nên chưa trả lời được. Bạn thử gửi lại sau ít phút nhé.`,
        });
      }
      return reply;
    },
  };
}

/** Lịch sử bỏ dòng thẻ gợi ý trong câu trả lời cũ (cho bộ phân loại an toàn, câu tóm tắt): chỉ câu văn. */
function plain(history: Turn[]): Turn[] {
  return history.map((h) => (h.role === "assistant" ? { ...h, content: stripCardLines(h.content) } : h));
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
    // trong các tin gần đây trợ lý đã phải dùng câu trả lời soạn sẵn
    afterCrisis: recent.some((r) => r.is_crisis_response),
  };
}

/**
 * Chuyện bận lòng của CHÍNH học sinh này (còn đang theo dõi): chủ đề, mức lo, khó khăn đã xác nhận,
 * việc nhỏ đã làm và kết quả học sinh tự báo khi được hỏi lại. `items` gồm chủ đề và việc nhỏ hiện được.
 */
async function loadWorry(admin: Admin, worryId: string, userId: string, items: SupportItem[]): Promise<(WorryContext & { id: string }) | null> {
  const { data } = await admin
    .from("worries")
    .select("id, topic, level_now")
    .eq("id", worryId)
    .eq("user_id", userId)
    .in("status", ["open", "better"])
    .maybeSingle();
  if (!data) return null;
  const topic = items.find((t) => t.kind === "topic" && t.topic === data.topic);
  const [difficulties, done, checks] = await Promise.all([
    difficultiesOf(userId, [data.id]),
    actionsDoneFor(userId, data.id),
    admin.from("worry_checks").select("tried, tried_action, created_at").eq("worry_id", data.id).eq("user_id", userId).order("created_at"),
  ]);
  // kết quả mới nhất học sinh báo cho từng việc (chưa chạy 0014 thì không có)
  const result = new Map<string, Tried>();
  for (const c of (checks.error ? [] : (checks.data ?? [])) as { tried: unknown; tried_action: string | null }[]) {
    if (c.tried_action && isTried(c.tried)) result.set(c.tried_action, c.tried);
  }
  const title = (key: string) => items.find((i) => i.kind === "tiny_action" && i.key === key)?.data.title;
  return {
    id: data.id,
    topicLabel: topic ? String(topic.data.label) : String(data.topic),
    level: data.level_now as number,
    difficulty: difficulties.get(data.id) ?? null,
    tried: done.slice(0, 4).map((key) => ({ title: String(title(key) ?? ""), result: result.get(key) ?? null })),
  };
}

/** Bài tập trong một bài ĐÃ ĐĂNG (đọc bằng quyền học sinh). Không gửi đáp án đúng cho trợ lý. */
async function loadLesson(slug: string, exerciseId: string): Promise<LessonContext | null> {
  const lesson = await getLesson(slug).catch(() => undefined);
  const exercise = lesson?.exercises.find((e) => e.id === exerciseId);
  return lesson && exercise ? { title: lesson.title, exercise: { type: exercise.type, prompt: exercise.prompt, options: exercise.options } } : null;
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

const SKILL_LINE = /^\s*\[SKILL:/m;
const MISSING_COLUMN = new Set(["42703", "PGRST204"]);

/** Trạng thái SEL đã lưu của cuộc trò chuyện (chủ đã kiểm tra ở trên). Chưa chạy migration 0022 hay đọc lỗi: trạng thái rỗng. */
async function loadSelState(admin: Admin, conversationId: string): Promise<SelState> {
  const { data, error } = await admin.from("conversations").select("sel_state").eq("id", conversationId).maybeSingle();
  if (error) return EMPTY_STATE;
  return parseState((data as { sel_state?: unknown } | null)?.sel_state);
}

async function saveSelState(admin: Admin, conversationId: string, state: SelState) {
  const { error } = await admin.from("conversations").update({ sel_state: state }).eq("id", conversationId);
  if (error && !MISSING_COLUMN.has(error.code)) console.warn("[F-Mood] Lưu trạng thái SEL lỗi", error.message);
}

/** Lần check-in gần nhất của học sinh nếu còn mới (lib/checkin-context.ts); không có hoặc lỗi thì null. */
async function recentCheckin(admin: Admin, userId: string): Promise<{ line: string; emotion: string | null } | null> {
  const { data } = await admin.from("checkins").select("emotions, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data || !freshCheckin(data.created_at as string)) return null;
  const c = checkinContext((data.emotions as string[]) ?? []);
  return c.line ? c : null;
}

/** Bối cảnh từ một trang nhật ký của chính học sinh (lib/journal-shared.ts); không có, không phải của mình hoặc lỗi thì rỗng. */
async function journalLineFor(admin: Admin, userId: string, entryId: string): Promise<string> {
  const { data } = await admin.from("journal_entries").select("prompt_text, body").eq("id", entryId).eq("user_id", userId).maybeSingle();
  return data ? journalContext((data.prompt_text as string) ?? "", (data.body as string) ?? "") : "";
}
