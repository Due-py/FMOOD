// GỘP CẢNH BÁO (hàm thuần, có test: alert-merge.test.ts).
// Một bạn kể liền mấy tin về cùng một chuyện: chỉ MỘT cảnh báo "cần để ý" (thêm lý do mới vào), không phải mỗi tin một cảnh báo.
// Cảnh báo khẩn cấp KHÔNG bao giờ bị gộp: luôn tạo mới và gửi email như cũ.

/** Trong khoảng này, cảnh báo "cần để ý" mới của cùng bạn, cùng loại được gộp vào cảnh báo chưa xử lý xong. */
export const MERGE_WINDOW_MS = 3 * 60 * 60_000;
export const MAX_REASONS = 8;

export type OpenAlert = { id: string; type: string; severity: "watch" | "urgent"; status: string; created_at: string; reasons: string[] | null };

/** Cảnh báo đang mở để gộp vào, hoặc null (tạo mới). `rows`: cảnh báo gần đây của bạn ấy. */
export function mergeTarget(rows: OpenAlert[], incoming: { type: string; severity: "watch" | "urgent" }, now: Date): OpenAlert | null {
  if (incoming.severity === "urgent") return null;
  const since = now.getTime() - MERGE_WINDOW_MS;
  return (
    rows
      .filter((r) => r.type === incoming.type && r.status !== "resolved" && Date.parse(r.created_at) >= since)
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0] ?? null
  );
}

/** Lý do cũ + lý do mới, không trùng, tối đa MAX_REASONS. */
export function mergeReasons(old: string[] | null, add: string[]): string[] {
  return [...new Set([...(old ?? []), ...add])].slice(0, MAX_REASONS);
}
