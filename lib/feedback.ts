// Phản hồi 👍/👎 cho câu trả lời của Mây (dùng chung cho server và trình duyệt).

export const FEEDBACK_REASONS = {
  too_long: { label: "Dài quá", instruction: "Bạn này thích câu trả lời RẤT ngắn: 1–2 câu, đi thẳng vào ý." },
  misunderstood: {
    label: "Chưa hiểu ý mình",
    instruction: "Bạn này từng thấy Mây hiểu sai ý. Hãy nhắc lại ngắn gọn điều bạn ấy vừa nói để chắc đã hiểu đúng trước khi hỏi tiếp.",
  },
  too_many_questions: {
    label: "Hỏi nhiều quá",
    instruction: "Bạn này không thích bị hỏi nhiều. Hỏi ít lại, có lượt chỉ cần lắng nghe và đồng cảm, không cần đặt câu hỏi.",
  },
  not_helpful: {
    label: "Chưa hữu ích",
    instruction: "Bạn này muốn câu trả lời thiết thực hơn. Khi phù hợp, đưa một gợi ý nhỏ, cụ thể có thể làm ngay (vẫn trong giới hạn an toàn).",
  },
  tone: { label: "Giọng chưa hợp", instruction: "Bạn này thấy giọng của Mây chưa hợp. Nói tự nhiên, gần gũi như bạn bè, tránh câu khuôn mẫu." },
} as const;

export type FeedbackReason = keyof typeof FEEDBACK_REASONS;

export const REASON_KEYS = Object.keys(FEEDBACK_REASONS) as FeedbackReason[];

export function isReason(v: unknown): v is FeedbackReason {
  return typeof v === "string" && v in FEEDBACK_REASONS;
}
