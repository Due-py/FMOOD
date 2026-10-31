// Giọt nước từ vòng hỗ trợ (dùng chung, không đọc cơ sở dữ liệu).

/** Mỗi loại việc (lưu chuyện, việc nhỏ, trả lời hỏi thăm, đã kể) được tối đa 1 giọt mỗi ngày. Không bao giờ trừ. */
export function supportDrops(rows: { kind: string; day: string }[]): number {
  return new Set(rows.filter((r) => DROP_KINDS.has(r.kind)).map((r) => `${r.kind}|${r.day}`)).size;
}

/** Các loại việc được tính giọt nước (sổ hoạt động còn ghi dữ liệu đo, như trả lời trợ lý đoán chủ đề). */
const DROP_KINDS = new Set(["worry_saved", "tiny_action_done", "followup_answered", "told"]);
