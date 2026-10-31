// Gộp cảnh báo "cần để ý" liên tiếp của cùng một bạn. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeReasons, mergeTarget, type OpenAlert } from "./alert-merge";

const NOW = new Date("2026-10-31T12:45:00+07:00");
const at = (minAgo: number) => new Date(NOW.getTime() - minAgo * 60_000).toISOString();
const row = (p: Partial<OpenAlert>): OpenAlert => ({ id: "a", type: "chat_risk", severity: "watch", status: "new", created_at: at(5), reasons: ["x"], ...p });

test("4 tin liền trong vài phút: gộp vào cảnh báo đang mở", () => {
  assert.equal(mergeTarget([row({ id: "a" })], { type: "chat_risk", severity: "watch" }, NOW)?.id, "a");
});

test("cảnh báo khẩn cấp không bao giờ bị gộp", () => {
  assert.equal(mergeTarget([row({})], { type: "chat_risk", severity: "urgent" }, NOW), null);
});

test("đã có cảnh báo khẩn cấp đang mở: cảnh báo cần để ý mới gộp vào đó", () => {
  assert.equal(mergeTarget([row({ id: "k", severity: "urgent" })], { type: "chat_risk", severity: "watch" }, NOW)?.id, "k");
});

test("không gộp: đã xử lý xong, quá 3 giờ, hoặc khác loại", () => {
  const incoming = { type: "chat_risk", severity: "watch" as const };
  assert.equal(mergeTarget([row({ status: "resolved" })], incoming, NOW), null);
  assert.equal(mergeTarget([row({ created_at: at(181) })], incoming, NOW), null);
  assert.equal(mergeTarget([row({ type: "lesson_risk" })], incoming, NOW), null);
});

test("lý do gộp không trùng, tối đa 8", () => {
  assert.deepEqual(mergeReasons(["a", "b"], ["b", "c"]), ["a", "b", "c"]);
  assert.equal(mergeReasons(Array.from({ length: 8 }, (_, i) => String(i)), ["z"]).length, 8);
});
