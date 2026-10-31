// Giọt nước từ vòng hỗ trợ. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { supportDrops } from "./garden-drops";

test("mỗi loại việc tối đa 1 giọt mỗi ngày", () => {
  const rows = [
    { kind: "worry_saved", day: "2026-10-25" },
    { kind: "worry_saved", day: "2026-10-25" },
    { kind: "tiny_action_done", day: "2026-10-25" },
    { kind: "tiny_action_done", day: "2026-10-25" },
    { kind: "told", day: "2026-10-25" },
    { kind: "worry_saved", day: "2026-10-26" },
    { kind: "followup_answered", day: "2026-10-28" },
  ];
  assert.equal(supportDrops(rows), 5);
});

test("chưa làm gì thì 0 giọt", () => {
  assert.equal(supportDrops([]), 0);
});

test("trả lời trợ lý đoán chủ đề không tính giọt nước (chỉ là dữ liệu đo)", () => {
  assert.equal(
    supportDrops([
      { kind: "topic_guess_yes", day: "2026-10-25" },
      { kind: "topic_guess_no", day: "2026-10-26" },
      { kind: "told", day: "2026-10-26" },
    ]),
    1,
  );
});
