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
