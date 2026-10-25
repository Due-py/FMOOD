// Giọt nước từ vòng hỗ trợ (dùng chung, không đọc cơ sở dữ liệu).

/** Mỗi loại việc (lưu chuyện, việc nhỏ, trả lời hỏi thăm, đã kể) được tối đa 1 giọt mỗi ngày. Không bao giờ trừ. */
export function supportDrops(rows: { kind: string; day: string }[]): number {
  return new Set(rows.map((r) => `${r.kind}|${r.day}`)).size;
}
