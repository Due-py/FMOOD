// ĐƯỜNG ĐI CỦA MỘT LƯỢT TRÒ CHUYỆN (hàm thuần, có test: turn-path.test.ts). app/api/chat/route.ts dùng đúng các hàm này.
// Gom ở một chỗ để kiểm thử được bốn đường KHÔNG qua bộ điều phối SEL (góp ý "5 cải tiến", 31/10 khuya):
//  1. lượt bấm nút ("… hiểu chưa đúng", "Bỏ qua");  2. mở từ bài tập để hỏi bài;  3. admin tắt bộ điều phối;
//  4. AI nhận diện / phân loại bị lỗi.
// Ở cả bốn đường: lớp từ khóa luôn chạy; câu trả lời của AI luôn qua bộ kiểm tra trước khi hiện (guardReply trong
// startReply của route, mọi câu trả lời AI đều đi qua đó); mức khẩn cấp luôn dùng câu soạn sẵn, AI không được viết.
// Đường 4 KHÔNG trở về trò chuyện tự do: AI phân loại lỗi thì coi là "đáng lo" (lời dặn nhẹ nhàng, không thẻ, báo thầy cô
// mức "để ý" kèm lý do "AI phân loại lỗi"); bật bộ điều phối mà không có nhận diện lượt cũng đi đường "đáng lo".
import type { RiskLevel } from "@/lib/safety/keywords";

export type TurnButton = "correction" | "skip";

/** Có gọi AI phân loại an toàn cho lượt này không (false: chỉ dùng kết quả lớp từ khóa). */
export function needsClassifier(keywordLevel: RiskLevel, turn: TurnButton | undefined, isSkipMessage: boolean): boolean {
  // từ khóa đã rõ là khẩn cấp: không cần chờ AI
  if (keywordLevel === "urgent") return false;
  // "Bỏ qua" gửi câu soạn sẵn, không phải lời học sinh: chấm lại sẽ đọc bối cảnh lượt trước và tạo cảnh báo trùng
  if (turn === "skip" && isSkipMessage) return false;
  return true;
}

/** Bộ điều phối SEL chỉ chạy ở lượt học sinh tự viết, không ở lượt bấm nút, không khi hỏi bài tập, không khi đã khẩn cấp. */
export function engineAllowed(keywordLevel: RiskLevel, turn: TurnButton | undefined, lesson: boolean): boolean {
  return keywordLevel !== "urgent" && !turn && !lesson;
}

/**
 * Cách soạn câu trả lời sau khi có kết quả an toàn:
 *  - "khan-cap": câu soạn sẵn đã được duyệt, AI không viết;
 *  - "dang-lo": lời dặn lượt đáng lo (nhẹ nhàng, không thẻ, gợi ý người lớn);
 *  - "theo-buoc": lời dặn + một bước bộ điều phối chọn;
 *  - "loi-dan": chỉ lời dặn (bộ điều phối tắt hoặc không áp dụng cho lượt này).
 */
export type ReplyPath = "khan-cap" | "dang-lo" | "theo-buoc" | "loi-dan";

export function replyPath({ level, afterCrisis, engine, hasSel }: { level: RiskLevel; afterCrisis: boolean; engine: boolean; hasSel: boolean }): ReplyPath {
  if (level === "urgent") return "khan-cap";
  if (level === "concern" || afterCrisis) return "dang-lo";
  // bộ điều phối bật mà không có nhận diện lượt: không trả về trò chuyện tự do
  if (engine && !hasSel) return "dang-lo";
  return engine ? "theo-buoc" : "loi-dan";
}
