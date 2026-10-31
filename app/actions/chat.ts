"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isReason } from "@/lib/feedback";
import { requireProfile } from "@/lib/auth";
import { STOP_LINE } from "@/lib/chat-loop";
import { dayKey } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Xóa một cuộc trò chuyện (tin nhắn bị xóa theo). */
export async function deleteConversation(id: string, goBack = false) {
  const profile = await requireProfile();
  const supabase = await createClient();
  await supabase.from("conversations").delete().eq("id", id).eq("user_id", profile.id);
  revalidatePath("/chat");
  if (goBack) redirect("/chat");
}

/**
 * Phản hồi 👍 / 👎 cho một câu trả lời của trợ lý. rating = null để bỏ phản hồi.
 * RLS bảo đảm học sinh chỉ chấm được câu trả lời trong cuộc trò chuyện của mình.
 */
export async function setFeedback(
  messageId: string,
  rating: 1 | -1 | null,
  reason: string | null = null,
): Promise<{ ok: boolean }> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(messageId).success) return { ok: false };
  const supabase = await createClient();

  if (rating === null) {
    const { error } = await supabase.from("message_feedback").delete().eq("message_id", messageId);
    return { ok: !error };
  }
  const { error } = await supabase.from("message_feedback").upsert({
    message_id: messageId,
    user_id: profile.id,
    rating,
    reason: rating === -1 && isReason(reason) ? reason : null,
    updated_at: new Date().toISOString(),
  });
  // không revalidate: trang chat đang mở sẽ bị dựng lại (mất trạng thái), còn trang "Tôi" luôn đọc mới
  return { ok: !error };
}

/** Xóa mọi phản hồi để trợ lý "quên" cách đã điều chỉnh cho học sinh này. */
export async function resetChatPreferences(): Promise<{ ok: boolean }> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("message_feedback").delete().eq("user_id", profile.id);
  revalidatePath("/me");
  return { ok: !error };
}

/**
 * Học sinh bấm "Dừng" (QT09): trợ lý chào bằng câu soạn sẵn, KHÔNG gọi AI, không hỏi thêm, không giữ lại.
 * Lưu câu chào vào cuộc trò chuyện để lần sau mở lại vẫn thấy đã dừng ở đâu.
 */
export async function stopChat(conversationId: string): Promise<{ ok: true; line: string } | { ok: false }> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(conversationId).success) return { ok: false };
  const admin = createAdminClient();
  const { data: conv } = await admin.from("conversations").select("id").eq("id", conversationId).eq("user_id", profile.id).maybeSingle();
  if (!conv) return { ok: false };
  const { error } = await admin.from("messages").insert({ conversation_id: conversationId, role: "assistant", content: STOP_LINE });
  if (error) return { ok: false };
  // chỉ ghi là đã bấm Dừng (đo được bao nhiêu bạn dừng), không ghi nội dung; chưa chạy 0014 thì bỏ qua
  await admin.from("support_activity").insert({ user_id: profile.id, kind: "chat_stop", day: dayKey() });
  return { ok: true, line: STOP_LINE };
}
