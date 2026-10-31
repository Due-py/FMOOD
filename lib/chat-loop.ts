// NÚT TRONG TRÒ CHUYỆN: "trợ lý hiểu chưa đúng", "Bỏ qua", "Dừng" (QT05, QT06, QT09) và lúc trợ lý xin xác nhận
// khó khăn (QT03). Hàm thuần, dùng chung cho trình duyệt và máy chủ, có test.

/** Trợ lý chào khi học sinh bấm "Dừng": câu soạn sẵn, không gọi AI, không hỏi thêm. */
export const STOP_LINE = "Mình dừng ở đây nhé. Cảm ơn bạn đã kể. Lúc nào muốn nói tiếp, bạn cứ quay lại, không cần giải thích gì đâu.";

/** Trợ lý hỏi lại khi học sinh bấm "trợ lý hiểu chưa đúng" (chưa gọi AI: chờ học sinh nói lại). */
export const CORRECTION_ASK = "Cảm ơn bạn đã nói. Mình hiểu chưa đúng ở đâu? Đúng ra là chuyện gì vậy, bạn kể lại ngắn thôi cũng được.";

/** Trợ lý hỏi lại khi học sinh bấm "Không phải" ở câu đoán chủ đề. */
export const TOPIC_NO_ASK = "À, vậy là mình đoán sai rồi. Đúng ra là chuyện gì? Bạn chọn một chủ đề, hoặc kể lại ngắn để mình hiểu đúng hơn.";

/** Chữ hiện trong bong bóng của học sinh khi bấm "Bỏ qua" (cũng là tin nhắn gửi cho trợ lý). */
export const SKIP_MESSAGE = "Mình muốn bỏ qua câu này.";

/**
 * Có nên xin trợ lý tóm tắt khó khăn sau lượt này không (để học sinh bấm "Đúng rồi" / sửa)?
 * - Vừa bấm "trợ lý hiểu chưa đúng" và nói lại: luôn xin (QT05: nói lại theo ý mới rồi hỏi đã đúng chưa).
 * - Chuyện bận lòng chưa có khó khăn đã xác nhận, học sinh đã kể từ 2 lượt và chưa được hỏi trong cuộc trò chuyện này (QT03).
 * - Đã bấm "Dừng" hoặc "Bỏ qua" ở lượt này: không xin (không hỏi dồn, QT06, QT09).
 */
export function wantsSummary(s: {
  turn: "correction" | "skip" | null;
  linkedToWorry: boolean;
  hasConfirmed: boolean;
  userTurns: number;
  alreadyAsked: boolean;
  stopped: boolean;
}): boolean {
  if (s.stopped || s.turn === "skip") return false;
  if (s.turn === "correction") return true;
  return s.linkedToWorry && !s.hasConfirmed && !s.alreadyAsked && s.userTurns >= 2;
}

/**
 * Làm sạch câu trợ lý tóm tắt khó khăn trước khi cho học sinh xác nhận: bỏ ngoặc kép, dấu chấm cuối và câu hỏi lại
 * ("…, mình hiểu vậy đúng chưa?") vì thẻ đã tự hỏi câu đó; câu lưu lại chỉ còn phần khó khăn.
 */
export function cleanSummary(text: string): string {
  return text
    .trim()
    .replace(/^["“«]+|["”»]+$/g, "")
    .replace(/[,.;:\s-]*(?:(?:mình|Sóc|Cú|Kiến)\s+)?(?:(?:hiểu|nói)(?:\s+(?:vậy|như vậy|thế))?\s+)?(?:có\s+)?đúng\s+(?:không|chưa)\s*\?*\s*$/iu, "")
    .replace(/[\s.?!,;:]+$/u, "")
    .trim();
}
