// Nội dung vòng hỗ trợ: ai thấy mục nào, dữ liệu mục hợp lệ, nhập nội dung mẫu. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { isVisible, parseItemData, planImport, type ContentStatus } from "./support-content";

test("lớp thật chỉ thấy mục Bật; lớp thử thấy Chỉ lớp thử và Bật; không ai thấy mục Tắt", () => {
  const cases: [ContentStatus, boolean, boolean][] = [
    ["off", false, false],
    ["off", true, false],
    ["test", false, false],
    ["test", true, true],
    ["on", false, true],
    ["on", true, true],
  ];
  for (const [status, isTestClass, expected] of cases) {
    assert.equal(isVisible(status, isTestClass), expected, `${status} / lớp thử=${isTestClass}`);
  }
});

test("câu điền chỗ trống phải có ___", () => {
  assert.equal(parseItemData("fill_blank", { text: "Hôm nay mình thấy buồn" }).ok, false);
  assert.equal(parseItemData("fill_blank", { text: "Hôm nay mình thấy ___ vì ___" }).ok, true);
});

test("việc nhỏ dài 1–10 phút và có ít nhất một bước", () => {
  const ok = { title: "Hít thở hộp", minutes: 2, steps: ["Hít vào 4 nhịp"] };
  assert.equal(parseItemData("tiny_action", ok).ok, true);
  assert.equal(parseItemData("tiny_action", { ...ok, minutes: 15 }).ok, false);
  assert.equal(parseItemData("tiny_action", { ...ok, steps: [] }).ok, false);
});

test("chủ đề phải có cụm từ nhận diện", () => {
  assert.equal(parseItemData("topic", { label: "Học tập", emoji: "📚", triggers: [] }).ok, false);
  assert.equal(parseItemData("topic", { label: "Học tập", emoji: "📚", triggers: ["bài kiểm tra"] }).ok, true);
});

test("nhập nội dung mẫu chỉ thêm mục mới, luôn ở trạng thái Tắt", () => {
  const file = [
    { key: "topic.hoc-tap", kind: "topic" as const, topic: "hoc-tap", sortOrder: 1, data: { label: "Học tập", emoji: "📚", triggers: ["thi"] } },
    { key: "fill.1", kind: "fill_blank" as const, topic: null, sortOrder: 1, data: { text: "Mình thấy ___" } },
  ];
  const rows = planImport(file, new Set(["topic.hoc-tap"]));
  assert.deepEqual(
    rows.map((r) => [r.key, r.status]),
    [["fill.1", "off"]],
  );
});
