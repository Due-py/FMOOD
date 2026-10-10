// Kiểm tra bộ lọc từ khóa. Chạy: npm test
// Khi thêm cụm từ mới vào keywords.ts, thêm câu thử vào đây.
import assert from "node:assert/strict";
import { test } from "node:test";
import { keywordCheck, type RiskLevel } from "./keywords";

const CASES: [string, RiskLevel][] = [
  // nguy hiểm
  ["Mình muốn chết", "urgent"],
  ["dạo này em không muốn sống nữa", "urgent"],
  ["tớ nghĩ tới chuyện tự tử", "urgent"],
  ["Mình bị bố đánh đập", "urgent"],
  ["có lúc mình muốn tự làm đau bản thân", "urgent"],
  // đáng lo
  ["Mình bị bắt nạt ở lớp", "concern"],
  ["hôm qua bị mẹ đánh vì điểm kém", "concern"],
  // nói quá / chuyện thường: không được báo nhầm
  ["Mệt muốn chết luôn á", "none"],
  ["chán chết đi được", "none"],
  ["đói muốn chết", "none"],
  ["bài này bị đánh giá thấp quá", "none"],
  ["sáng nay bị đánh thức sớm", "none"],
  ["hôm nay vui ghê", "none"],
];

for (const [text, expected] of CASES) {
  test(`"${text}" → ${expected}`, () => {
    assert.equal(keywordCheck(text).level, expected);
  });
}
