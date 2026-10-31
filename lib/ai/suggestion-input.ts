// Nội dung gửi AI tạo gợi ý trả lời nhanh (hàm thuần, có test: suggestion-input.test.ts).
// Thử thật 31/10: chỉ gửi tin cuối + câu trả lời cuối thì AI lấy chi tiết từ VÍ DỤ minh họa trong câu trả lời
// ("tin nhắn ngắn", "bạn ấy") làm gợi ý, chả liên quan chuyện học sinh đang kể. Nay gửi kèm các lượt trước và tách riêng
// những gì CHÍNH HỌC SINH đã nói để AI bám vào đó.

export type Turn = { role: "user" | "assistant"; content: string };

const MAX_TURNS = 8;
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

export function suggestionInput(history: Turn[], lastUser: string, reply: string): string {
  const recent = history.slice(-MAX_TURNS);
  const studentSaid = [...recent.filter((t) => t.role === "user").map((t) => t.content), lastUser].map((s) => `- ${clip(s.trim(), 200)}`);
  return [
    recent.length
      ? `CÁC LƯỢT TRƯỚC:\n${recent.map((t) => `${t.role === "user" ? "Học sinh" : "Trợ lý"}: ${clip(t.content, 400)}`).join("\n")}`
      : "",
    `ĐIỀU CHÍNH HỌC SINH ĐÃ NÓI (gợi ý chỉ được dựa vào chuyện này):\n${studentSaid.join("\n")}`,
    `TIN MỚI CỦA HỌC SINH:\n${clip(lastUser, 500)}`,
    `TRỢ LÝ VỪA TRẢ LỜI (cần gợi ý câu đáp lại câu này):\n${clip(reply, 1200)}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
