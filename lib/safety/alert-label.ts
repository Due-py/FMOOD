// NHÃN NGỮ CẢNH CỦA CẢNH BÁO (hàm thuần, có test: alert-label.test.ts).
// Duy quyết 01/11 (mục 2): học sinh viết về MỘT BẠN KHÁC trong bài luyện mà chạm lớp an toàn thì vẫn báo thầy cô như mọi
// cảnh báo (cùng loại, cùng mức), chỉ ghi rõ "Về một bạn khác (bài luyện: …)" để thầy cô biết đang đọc chuyện về ai.
// Nhãn đứng đầu đoạn trích và là lý do đầu tiên (cảnh báo "cần để ý" gộp vào cảnh báo đang mở chỉ thêm lý do).

export function labelAlert(
  excerpt: string | undefined,
  reasons: string[],
  context: string | null | undefined,
): { excerpt: string | undefined; reasons: string[] } {
  const label = context?.trim();
  if (!label) return { excerpt, reasons };
  return {
    excerpt: excerpt ? `${label}: ${excerpt}` : label,
    reasons: [label, ...reasons.filter((r) => r !== label)],
  };
}
