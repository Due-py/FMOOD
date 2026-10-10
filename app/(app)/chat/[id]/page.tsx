import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SupportCard } from "@/components/SupportCard";
import { isReason } from "@/lib/feedback";
import { getLesson } from "@/lib/lessons";
import { getSetting } from "@/lib/settings";
import { ChatView, type ChatMessage } from "./ChatView";

export const metadata: Metadata = { title: "Trò chuyện với Mây" };

export default async function ChatPage({ params, searchParams }: PageProps<"/chat/[id]">) {
  const { id } = await params;
  const { bai, cau } = await searchParams;
  const profile = await requireProfile();

  let messages: ChatMessage[] = [];
  let conversationId: string | null = null;

  if (id !== "new") {
    if (!z.uuid().safeParse(id).success) notFound();
    const supabase = await createClient();
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", id)
      .eq("user_id", profile.id)
      .maybeSingle();
    if (!conv) notFound();
    conversationId = conv.id;

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

    messages = rows.map((m, i, all) => {
      const fb = fbById.get(m.id);
      return {
        id: m.id,
        dbId: m.id,
        role: m.role,
        content: m.content,
        crisis: m.is_crisis_response,
        // hiện thẻ hỗ trợ sau câu trả lời cho một tin nhắn bị gắn cờ
        support: m.role === "assistant" && i > 0 && all[i - 1].flagged,
        feedback: fb ? { rating: fb.rating as 1 | -1, reason: isReason(fb.reason) ? fb.reason : null } : null,
        // chỉ giữ gợi ý của câu trả lời cuối cùng
        suggestions: i === all.length - 1 ? (m.suggestions ?? []) : [],
      };
    });
  }

  // mở từ nút "Hỏi Mây" trong bài tập: soạn sẵn câu mở đầu về bài đó
  let initialDraft = "";
  if (id === "new" && typeof bai === "string") {
    const lesson = await getLesson(bai);
    const exercise = lesson?.exercises.find((e) => e.id === cau);
    if (lesson && exercise) {
      initialDraft = `Mình đang làm bài tập trong bài “${lesson.title}”: “${exercise.prompt}” mà chưa biết bắt đầu thế nào.`;
    }
  }

  return (
    <ChatView
      initialDraft={initialDraft}
      key={conversationId ?? "new"}
      conversationId={conversationId}
      initialMessages={messages}
      nickname={profile.nickname}
      starters={(await getSetting("chat.starters")).items}
      supportCards={{
        urgent: <SupportCard tone="urgent" teacherNotified />,
        gentle: <SupportCard tone="gentle" teacherNotified />,
      }}
    />
  );
}
