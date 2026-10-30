// KIỂM TRA CÂU TRẢ LỜI CỦA MÂY TRƯỚC KHI HIỆN (hàm thuần, không gọi AI nên gần như không tốn thời gian).
// Chặn những câu AI có thể viết sai mà lời dặn đã cấm: hứa đã báo thầy cô (QT11), chẩn đoán bệnh,
// nói tên thuốc, hứa giữ bí mật tuyệt đối, xin thông tin cá nhân, hướng dẫn tự làm hại.

export type GuardReason =
  | "hua-da-bao"
  | "chan-doan"
  | "ten-thuoc"
  | "hua-bi-mat"
  | "xin-thong-tin"
  | "huong-dan-nguy-hiem";

const RULES: { reason: GuardReason; pattern: RegExp }[] = [
  {
    // "mình đã báo cô chủ nhiệm", "thầy cô đang đến", "mình đã gọi người giúp bạn"
    reason: "hua-da-bao",
    pattern:
      /(mình|tớ|Mây)\s+(đã|vừa|sẽ)\s+(báo|gửi|nhắn|gọi|chuyển lời|kể)\s+(cho\s+|với\s+)?(thầy|cô|giáo viên|phòng tham vấn|tư vấn viên|bố mẹ|ba mẹ|người lớn|ai đó|người giúp)|(thầy cô|thầy|cô|người lớn|ai đó|người)\s+(đang|sẽ)\s+(đến|tới)\s+(ngay|giúp|với)/iu,
  },
  {
    reason: "chan-doan",
    pattern:
      /(bạn|cậu|em)\s+(đang\s+|có thể\s+|chắc là\s+|có lẽ\s+)?(bị|mắc|có dấu hiệu|có triệu chứng)\s+(của\s+)?(bệnh\s+)?(trầm cảm|rối loạn|tâm thần|tự kỷ|adhd|tăng động|lưỡng cực)/iu,
  },
  {
    reason: "ten-thuoc",
    pattern: /(thuốc ngủ|thuốc an thần|thuốc chống trầm cảm|seduxen|diazepam|xanax|prozac|sertraline|fluoxetine)/iu,
  },
  {
    reason: "hua-bi-mat",
    pattern: /(giữ bí mật tuyệt đối|không (ai|bao giờ có ai) biết (được )?đâu|mình hứa (sẽ )?không (nói|kể) với ai)/iu,
  },
  {
    reason: "xin-thong-tin",
    pattern:
      /(cho mình|gửi mình|nói mình|bạn (hãy )?cho mình)\s+(biết\s+|xin\s+)?(số điện thoại|địa chỉ( nhà)?|họ tên thật|tên thật|tên trường)/iu,
  },
  {
    reason: "huong-dan-nguy-hiem",
    pattern: /(cách|liều|bao nhiêu viên)\s.{0,20}(tự tử|tự sát|tự làm đau|tự làm hại|cắt tay)/iu,
  },
];

/** Câu thay thế khi câu trả lời bị chặn: thừa nhận, không giả vờ như không có gì. */
export const BLOCKED_REPLY =
  "Mình xin lỗi, câu trả lời vừa rồi của mình chưa phù hợp nên mình đã ẩn đi. Bạn kể tiếp cho mình nghe nhé? Nếu cần người thật, bạn bấm “Cần giúp” ở góc trên.";

export function guardReply(text: string): { ok: boolean; reasons: GuardReason[] } {
  const reasons = RULES.filter((r) => r.pattern.test(text)).map((r) => r.reason);
  return { ok: reasons.length === 0, reasons };
}

/**
 * Vị trí cắt an toàn để gửi dần: hết câu cuối cùng trong đoạn chữ (dấu . ! ? … hoặc xuống dòng).
 * Gửi theo từng câu đã kiểm tra thì học sinh vẫn thấy chữ hiện dần mà không thấy câu sai.
 */
export function lastSentenceEnd(text: string): number {
  let end = -1;
  for (const m of text.matchAll(/[.!?…\n]+["”)\]]*\s/gu)) end = (m.index ?? 0) + m[0].length;
  return end;
}
