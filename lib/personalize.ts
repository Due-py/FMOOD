import "server-only";
import { FEEDBACK_REASONS, isReason, type FeedbackReason } from "@/lib/feedback";
import { createAdminClient } from "@/lib/supabase/admin";

// CÁ NHÂN HÓA CUỘC TRÒ CHUYỆN
// Dựa trên phản hồi 👍/👎 gần đây của CHÍNH học sinh đó:
//  - lý do 👎 lặp lại ≥ 2 lần → thêm một dặn dò tương ứng vào lời dặn của trợ lý
//  - vài câu trả lời được 👍 gần nhất → làm mẫu giọng văn bạn ấy thích
// Không dùng phản hồi của học sinh này cho học sinh khác.

const RECENT = 30;
const MIN_REPEAT = 2;
const MAX_LIKED = 2;

export type ChatPreferences = {
  /** các lý do 👎 đã lặp lại đủ nhiều, kèm số lần */
  reasons: { reason: FeedbackReason; count: number }[];
  /** trích các câu trả lời được 👍 gần nhất */
  liked: string[];
  ups: number;
  downs: number;
};

export async function getChatPreferences(userId: string): Promise<ChatPreferences> {
  const { data } = await createAdminClient()
    .from("message_feedback")
    .select("rating, reason, messages(content)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(RECENT);

  const rows = data ?? [];
  const tally = new Map<FeedbackReason, number>();
  for (const r of rows) if (r.rating === -1 && isReason(r.reason)) tally.set(r.reason, (tally.get(r.reason) ?? 0) + 1);

  return {
    reasons: [...tally]
      .filter(([, n]) => n >= MIN_REPEAT)
      .sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => ({ reason, count })),
    liked: rows
      .filter((r) => r.rating === 1)
      .map((r) => (r.messages as unknown as { content: string } | null)?.content ?? "")
      .filter(Boolean)
      .slice(0, MAX_LIKED)
      .map((c) => (c.length > 300 ? `${c.slice(0, 300)}…` : c)),
    ups: rows.filter((r) => r.rating === 1).length,
    downs: rows.filter((r) => r.rating === -1).length,
  };
}

/** Phần thêm vào lời dặn của trợ lý cho riêng học sinh này. */
export function preferencePrompt(prefs: ChatPreferences): string {
  if (!prefs.reasons.length && !prefs.liked.length) return "";
  let out = "\n\nĐIỀU CHỈNH THEO PHẢN HỒI CỦA RIÊNG BẠN NÀY (vẫn tuân thủ mọi giới hạn ở trên):";
  for (const { reason } of prefs.reasons) out += `\n- ${FEEDBACK_REASONS[reason].instruction}`;
  if (prefs.liked.length) {
    out += "\n- Bạn này đã thích những câu trả lời như sau, hãy giữ giọng văn tương tự (KHÔNG lặp lại nguyên văn):";
    for (const l of prefs.liked) out += `\n  « ${l.replace(/\s+/g, " ")} »`;
  }
  return out;
}
