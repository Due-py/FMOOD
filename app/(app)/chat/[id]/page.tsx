import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SupportCard } from "@/components/SupportCard";
import { isReason } from "@/lib/feedback";
import { getLesson } from "@/lib/lessons";
import { getSetting } from "@/lib/settings";
import { chatLoop } from "@/lib/loop-content";
import { sourceFromParams } from "@/lib/chat-source";
import { difficultiesOf } from "@/lib/worries";
import { getStyleSettings, studentStyle } from "@/lib/assistant";
import { CHARACTER_KEYS } from "@/lib/ai/chat-style";
import { chatRestToday } from "@/lib/chat-rest-server";
import { parseState } from "@/lib/sel/engine";
import { selPanel, type SelPanel } from "@/lib/sel/practice-offer";
import { dayKey, formatDate, formatTime } from "@/lib/dates";
import { CHAT_PANEL_COOKIE, chatPanelOpen } from "@/lib/chat-panel";
import type { ChatHistoryItem } from "./ChatSidePanel";
import type { ChatWorry } from "./ChatLoopParts";
import { ChatView, type ChatMessage } from "./ChatView";

export const metadata: Metadata = { title: "Trò chuyện" };

export default async function ChatPage({ params, searchParams }: PageProps<"/chat/[id]">) {
  const { id } = await params;
  const { bai, cau, chuyen, tu, nk } = await searchParams;
  const profile = await requireProfile();

  let messages: ChatMessage[] = [];
  let conversationId: string | null = null;
  let panel: SelPanel | null = null;

  if (id !== "new") {
    if (!z.uuid().safeParse(id).success) notFound();
    const supabase = await createClient();
    const { data: conv } = await supabase
      .from("conversations")
      .select("id, sel_state")
      .eq("id", id)
      .eq("user_id", profile.id)
      .maybeSingle();
    if (!conv) notFound();
    conversationId = conv.id;
    panel = selPanel(parseState(conv.sel_state));

    const { data } = await supabase
      .from("messages")
      .select("id, role, content, flagged, is_crisis_response, suggestions")
      .eq("conversation_id", id)
      .order("created_at");
    const rows = data ?? [];
    const { data: feedback } = await supabase
      .from("message_feedback")
      .select("message_id, rating, reason")
      .in(
        "message_id",
        rows.filter((m) => m.role === "assistant").map((m) => m.id),
      );
    const fbById = new Map((feedback ?? []).map((f) => [f.message_id, f]));

    // khung "người lắng nghe" sau tin bị gắn cờ: chỉ hiện ở lần đầu trong cuộc trò chuyện (câu khẩn cấp luôn có khung),
    // để không lặp lại sau mọi lượt (Duy báo 01/11)
    let supportShown = false;
    messages = rows.map((m, i, all) => {
      const fb = fbById.get(m.id);
      const afterFlag = m.role === "assistant" && i > 0 && all[i - 1].flagged;
      const support = afterFlag && (m.is_crisis_response || !supportShown);
      if (support && !m.is_crisis_response) supportShown = true;
      return {
        id: m.id,
        dbId: m.id,
        role: m.role,
        content: m.content,
        crisis: m.is_crisis_response,
        // hiện thẻ hỗ trợ sau câu trả lời cho một tin nhắn bị gắn cờ
        support,
        feedback: fb ? { rating: fb.rating as 1 | -1, reason: isReason(fb.reason) ? fb.reason : null } : null,
        // chỉ giữ gợi ý của câu trả lời cuối cùng
        suggestions: i === all.length - 1 ? (m.suggestions ?? []) : [],
      };
    });
  }

  // mở từ nút "Hỏi …" (tên nhân vật) trong bài tập: soạn sẵn câu mở đầu về bài đó, và gửi kèm mã bài + câu
  // để máy chủ đưa tên bài, đề vào lời dặn (mục 5.3: giúp hiểu đề, chuẩn bị câu hỏi, không đưa đáp án)
  let initialDraft = "";
  let lessonRef: { slug: string; exerciseId: string } | null = null;
  if (id === "new" && typeof bai === "string") {
    const lesson = await getLesson(bai);
    const exercise = lesson?.exercises.find((e) => e.id === cau);
    if (lesson && exercise) {
      initialDraft = `Mình đang làm bài tập trong bài “${lesson.title}”: “${exercise.prompt}” mà chưa hiểu đề lắm.`;
      lessonRef = { slug: lesson.slug, exerciseId: exercise.id };
    }
  }

  // mở từ thẻ "Muốn kể với … về chuyện này không?" sau khi lưu một trang nhật ký: chỉ trang của chính học sinh;
  // máy chủ tự đọc trang (lib/journal-shared.ts, journalContext), trình duyệt chỉ gửi mã trang
  let journalId: string | null = null;
  if (id === "new" && typeof nk === "string" && z.uuid().safeParse(nk).success) {
    const supabase = await createClient();
    const { data } = await supabase.from("journal_entries").select("id").eq("id", nk).eq("user_id", profile.id).maybeSingle();
    if (data) {
      journalId = data.id as string;
      initialDraft ||= "Mình vừa viết nhật ký về chuyện này, mình muốn kể thêm.";
    }
  }

  // mở từ "Kể thêm" sau khi lưu chuyện bận lòng: trợ lý biết đang nói về chuyện gì
  const loop = await chatLoop(profile);
  let worry: ChatWorry | null = null;
  if (id === "new" && loop && typeof chuyen === "string" && z.uuid().safeParse(chuyen).success) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("worries")
      .select("id, topic, level_now")
      .eq("id", chuyen)
      .eq("user_id", profile.id)
      .maybeSingle();
    if (data && loop.topics[data.topic]) {
      const difficulty = (await difficultiesOf(profile.id, [data.id])).get(data.id) ?? null;
      worry = { id: data.id, topic: data.topic, level: data.level_now, difficulty };
    }
  }

  // nhân vật và cách trò chuyện học sinh đã chọn (chưa chọn: mặc định admin đặt); câu giới thiệu từng nhân vật
  // mục 4.4: đã trò chuyện bao lâu hôm nay (máy chủ đếm), để nhắc nghỉ ngay khi mở trang
  const [chatStyle, styles, rest] = await Promise.all([studentStyle(profile.id), getStyleSettings(), chatRestToday(profile.id)]);

  // thẻ Lịch sử của panel phải (trước đây là trang /chat)
  const { data: past } = await (await createClient())
    .from("conversations")
    .select("id, title, updated_at")
    .eq("user_id", profile.id)
    .order("updated_at", { ascending: false })
    .limit(50);
  const today = dayKey();
  const history: ChatHistoryItem[] = (past ?? []).map((c) => ({
    id: c.id as string,
    title: c.title as string,
    when: dayKey(c.updated_at) === today ? `Hôm nay, ${formatTime(c.updated_at)}` : formatDate(c.updated_at),
  }));
  const intros = Object.fromEntries(CHARACTER_KEYS.map((k) => [k, styles.characters.items[k].intro])) as Record<(typeof CHARACTER_KEYS)[number], string>;

  return (
    <ChatView
      chatStyle={chatStyle}
      intros={intros}
      history={history}
      sideOpen={chatPanelOpen((await cookies()).get(CHAT_PANEL_COOKIE)?.value)}
      loop={loop}
      source={sourceFromParams({ tu, chuyen: worry ? chuyen : undefined })}
      worry={worry}
      initialDraft={initialDraft}
      lesson={lessonRef}
      journalId={journalId}
      restMinutes={rest.remind ? rest.minutes : null}
      key={conversationId ?? "new"}
      conversationId={conversationId}
      initialPanel={panel}
      initialMessages={messages}
      nickname={profile.nickname}
      starters={(await getSetting("chat.starters")).items}
      supportCards={{
        urgent: <SupportCard tone="urgent" />,
        gentle: <SupportCard tone="gentle" />,
        urgentNotified: <SupportCard tone="urgent" teacherNotified />,
        gentleNotified: <SupportCard tone="gentle" teacherNotified />,
      }}
    />
  );
}
