// Câu khẩn cấp chỉ nói "thầy cô đã được báo" khi cảnh báo đã được ghi thật. Chạy: npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { crisisWithStatus, NOT_NOTIFIED_LINE, NOTIFIED_LINE } from "./crisis-text";

const ROOT = path.join(import.meta.dirname, "..", "..");
const fileText = readFileSync(path.join(ROOT, "content/safety/crisis-response.md"), "utf8")
  .replace(/<!--[\s\S]*?-->/g, "")
  .trim();

test("lời soạn sẵn trong file không tự khẳng định đã báo thầy cô", () => {
  assert.doesNotMatch(fileText, /đã được báo/u);
});

test("lời soạn sẵn xưng mình, không gọi tên nhân vật nào (câu khẩn cấp không đổi theo nhân vật)", () => {
  assert.doesNotMatch(fileText, /(^|[^\p{L}])(Mây|Sóc|Cú|Kiến)([^\p{L}]|$)/u);
});

test("đã ghi cảnh báo: thêm đúng một dòng đã báo, sau gạch đầu dòng cuối", () => {
  const out = crisisWithStatus(fileText, true);
  assert.equal(out.split(NOTIFIED_LINE).length - 1, 1);
  assert.ok(!out.includes(NOT_NOTIFIED_LINE));
  const lines = out.split("\n");
  const i = lines.indexOf(NOTIFIED_LINE);
  assert.match(lines[i - 1], /111/);
});

test("ghi cảnh báo lỗi: không nói đã báo, chỉ đường tự tìm người lớn", () => {
  const out = crisisWithStatus(fileText, false);
  assert.doesNotMatch(out, /đã được báo/u);
  assert.ok(out.includes(NOT_NOTIFIED_LINE));
});

test("lời cũ admin đã lưu có câu đã báo: bỏ câu đó nếu ghi cảnh báo lỗi", () => {
  const legacy = "Cảm ơn bạn.\n\n- Gọi **111**.\n- Thầy cô phụ trách của trường đã được báo để hỗ trợ bạn.\n\nMình ở đây.";
  const out = crisisWithStatus(legacy, false);
  assert.doesNotMatch(out, /đã được báo/u);
  assert.ok(out.includes(NOT_NOTIFIED_LINE));
  assert.ok(out.endsWith("Mình ở đây."));
});

test("lời không có gạch đầu dòng: thêm dòng trạng thái vào cuối", () => {
  const out = crisisWithStatus("Hãy gọi 111 ngay nhé.", true);
  assert.ok(out.endsWith(NOTIFIED_LINE));
});
