// Đổi tên "Mây" trong nội dung đã lưu (Bước 9.0). Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { renameAssistant, renameInJson } from "./rename-assistant";

test("đổi tên linh vật cũ, giữ chữ mây thường; đầu câu viết hoa", () => {
  assert.equal(renameAssistant("Mây ở đây nè. Kể Mây nghe nhé!"), "Mình ở đây nè. Kể mình nghe nhé!");
  assert.equal(renameAssistant("Nhìn đám mây trôi, Mây thấy vui."), "Nhìn đám mây trôi, mình thấy vui.");
  assert.equal(renameAssistant("Hỏi Mây", "Sóc"), "Hỏi Sóc");
  assert.equal(renameAssistant("“Mây hiểu rồi”"), "“Mình hiểu rồi”");
  assert.equal(renameAssistant("Mâyy và MâyHồng giữ nguyên"), "Mâyy và MâyHồng giữ nguyên");
});

test("đổi trong JSON lồng nhau, báo đúng chỗ đã đổi", () => {
  const { value, changes } = renameInJson({ text: "Mây hỏi thăm", list: ["ổn", "Kể Mây nghe"], n: 3 });
  assert.deepEqual(value, { text: "Mình hỏi thăm", list: ["ổn", "Kể mình nghe"], n: 3 });
  assert.deepEqual(changes.map((c) => c.path), ["text", "list[1]"]);
});
