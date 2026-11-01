// Câu trả lời soạn sẵn khi khẩn cấp phải nói ĐÚNG việc hệ thống đã làm (quy tắc QT11):
// chỉ nói "thầy cô đã được báo" khi cảnh báo đã được ghi thật.

/** Dòng báo trạng thái khi cảnh báo đã được ghi cho thầy cô phụ trách. */
export const NOTIFIED_LINE = "- Thầy cô phụ trách của trường đã được báo để có thể tìm gặp và hỗ trợ bạn.";

/** Dòng báo trạng thái khi chưa ghi được cảnh báo: không hứa, chỉ đường cho học sinh tự tìm người. */
export const NOT_NOTIFIED_LINE =
  "- Mình chưa chắc thầy cô đã nhận được tin. Bạn hãy bấm **Cần giúp** ở góc trên, hoặc nói ngay với một người lớn ở gần bạn nhé.";

// câu cũ trong lời soạn sẵn (admin có thể đã lưu) tự khẳng định đã báo thầy cô
const LEGACY_CLAIM = /đã được báo/iu;

/**
 * Gắn dòng trạng thái thật vào câu trả lời soạn sẵn.
 * Bỏ mọi dòng tự khẳng định "đã được báo" có sẵn trong lời soạn, rồi chèn dòng đúng
 * ngay sau gạch đầu dòng cuối cùng (không có gạch đầu dòng thì thêm vào cuối).
 */
export function crisisWithStatus(message: string, notified: boolean): string {
  const status = notified ? NOTIFIED_LINE : NOT_NOTIFIED_LINE;
  const lines = message.split("\n").filter((line) => !LEGACY_CLAIM.test(line));
  let lastBullet = -1;
  lines.forEach((line, i) => {
    if (/^\s*[-*]\s/.test(line)) lastBullet = i;
  });
  if (lastBullet === -1) return `${lines.join("\n").trim()}\n\n${status}`;
  lines.splice(lastBullet + 1, 0, status);
  return lines.join("\n").trim();
}

// ───────── Bài luyện về MỘT BẠN KHÁC (Duy quyết 01/11, mục 2) ─────────
// Ở hai mô-đun "Nhận ra khi bạn đang áp lực" và "Lắng nghe bạn đang áp lực" (lib/skills.ts PEER_RISK_SKILLS), học sinh thường
// viết về một người bạn. Khi lớp an toàn xếp khẩn cấp, luồng vẫn y như cũ (bài dừng, báo thầy cô cùng mức), chỉ câu hiện cho
// học sinh là bản dành cho người đang lo cho bạn. Chữ CỐ ĐỊNH, không qua AI; cùng số hỗ trợ với lời soạn sẵn
// (content/safety/crisis-response.md) và nút "Cần giúp". Dòng trạng thái thầy cô vẫn gắn bằng crisisWithStatus.

/** Câu khẩn cấp khi học sinh viết về một bạn khác (đi qua crisisWithStatus như câu soạn sẵn). */
export const PEER_CRISIS_MESSAGE = [
  "Cảm ơn bạn đã để ý tới bạn ấy. Điều bạn vừa viết rất quan trọng, và đây là chuyện cần người lớn biết ngay.",
  "",
  "Bạn không phải tự mình lo hết. Hãy kể sớm với một người lớn bạn tin: thầy cô chủ nhiệm, phòng tham vấn của trường hoặc bố mẹ. Kể với người lớn là đang giúp bạn ấy.",
  "",
  "- Nếu bạn ấy đang gặp nguy hiểm ngay bây giờ, hãy gọi **115** hoặc nói ngay với người lớn gần nhất.",
  "- Bạn có thể gọi **111** (Tổng đài quốc gia Bảo vệ trẻ em, miễn phí, 24/7) để được hướng dẫn cách giúp bạn ấy.",
  "- Bạn cũng có thể bấm **Cần giúp** ở góc trên để hẹn nói chuyện với thầy cô.",
].join("\n");

/**
 * Khung hỗ trợ khi trợ lý thoát vai bạn cùng lớp (lớp an toàn xếp "đáng lo", học sinh kể chuyện thật ngoài vai, hoặc không
 * muốn tập nữa). Chữ CỐ ĐỊNH (noi-dung.json, roleplay.breakCharacter), hiện kèm thẻ số hỗ trợ như ở trò chuyện.
 */
export const ROLEPLAY_BREAK_TEXT =
  "Mình dừng phần tập nói ở đây nhé. Nếu có chuyện gì làm bạn lo, bạn có thể kể với một người lớn bạn tin: thầy cô chủ nhiệm, phòng tham vấn của trường hoặc bố mẹ. Bạn cũng có thể bấm “Cần giúp” để hẹn nói chuyện với thầy cô. Các bước khác của bài luyện vẫn làm tiếp được.";
