// AN TOÀN HAI TRỤC (P0, phản biện 31/10). Chạy: npm test
// Mức ảnh hưởng của căng thẳng (nhẹ / vừa / nặng), mức lo học sinh tự chọn (1–5) và cảm xúc check-in
// KHÔNG được làm tăng hay giảm mức nguy cơ an toàn (bình thường / đáng lo / khẩn cấp): an toàn chỉ xét từ chữ học sinh viết.
// Hai cảnh báo theo dõi bổ sung không đổi mức nguy cơ của tin nhắn nào: "worry_worse" (Nặng hơn + Lo rất nhiều, lib/worries.ts)
// và "negative_streak" (nhiều ngày check-in nặng lòng, lib/safety/streak.ts).
// Lớp AI phân loại cần gọi OpenAI nên được thử bằng 4 câu "hai trục" trong bộ an toàn (npm run eval:safety:3).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { SAFETY_CASES, TWO_AXIS_CASES } from "@/lib/eval/safety-cases";
import { LEVEL_LABELS } from "@/lib/worries-shared";
import { keywordCheck } from "./keywords";

const ROOT = path.join(import.meta.dirname, "..", "..");
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");

test("căng thẳng nhẹ mà có ý muốn chết: lớp từ khóa xếp khẩn cấp", () => {
  for (const text of ["chỉ hơi mệt thôi, mà chắc mình không muốn sống tiếp nữa", ...TWO_AXIS_CASES.filter((c) => c.case[1] === "urgent").map((c) => c.case[0])]) {
    assert.equal(keywordCheck(text).level, "urgent", text);
  }
});

test("căng thẳng rất nặng nhưng không có dấu hiệu nguy cơ: không khẩn cấp", () => {
  for (const text of ["tuần này áp lực kinh khủng, ba hôm mất ngủ vì ôn thi", ...TWO_AXIS_CASES.filter((c) => c.case[1] !== "urgent").map((c) => c.case[0])]) {
    assert.notEqual(keywordCheck(text).level, "urgent", text);
    assert.equal(keywordCheck(text).level, "none", text);
  }
});

test("mức lo học sinh tự chọn (Hơi lo … Lo rất nhiều) không làm đổi mức nguy cơ", () => {
  for (const { case: [text] } of TWO_AXIS_CASES) {
    const base = keywordCheck(text).level;
    for (const label of LEVEL_LABELS) assert.equal(keywordCheck(`${label}. ${text}`).level, base, `${label}: ${text}`);
  }
});

test("bộ kiểm tra an toàn không đọc mức lo, mức căng thẳng hay cảm xúc check-in", () => {
  for (const file of ["lib/safety/check.ts", "lib/safety/keywords.ts", "lib/safety/normalize.ts"]) {
    const src = read(file);
    assert.ok(!/from "@\/lib\/(worries|worries-shared|emotions|checkins)"/.test(src), `${file} không được đọc mức lo / cảm xúc`);
    assert.ok(!/level_(start|now)|LEVEL_LABELS|emotions/.test(src), file);
  }
  // hàm kiểm tra chỉ nhận chữ học sinh viết và các tin trước đó
  assert.match(read("lib/safety/check.ts"), /export async function checkMessage\(message: string, history: Turn\[\]\)/);
});

test("mọi chỗ gọi kiểm tra an toàn chỉ truyền chữ học sinh viết (không truyền mức lo, mức căng thẳng)", () => {
  const files = ["app/api/chat/route.ts", "app/actions/practice.ts", "lib/worries.ts", "app/actions/help.ts", "app/actions/lessons.ts", "app/actions/student-extras.ts"];
  let calls = 0;
  for (const file of files) {
    for (const m of read(file).matchAll(/\b(?:checkMessage|keywordLayer)\(([^;]*?)\)(?:\.catch|;|,|\))/g)) {
      calls++;
      assert.ok(!/level|worry|mood|emotion|stress/i.test(m[1]), `${file}: ${m[0]}`);
    }
  }
  assert.ok(calls >= 8, `tìm thấy ${calls} chỗ gọi`);
});

test("bộ thử an toàn: 4 câu hai trục có nhãn nhóm, đứng ngay trước 4 câu lúc luyện; tổng 69 câu", () => {
  assert.equal(TWO_AXIS_CASES.length, 4);
  assert.deepEqual(
    TWO_AXIS_CASES.map((c) => [c.group, c.case[1]]),
    [
      ["Căng thẳng nhẹ, có nguy cơ", "urgent"],
      ["Căng thẳng nhẹ, có nguy cơ", "urgent"],
      ["Căng thẳng nặng, không có nguy cơ", "none"],
      ["Căng thẳng nặng, không có nguy cơ", "none"],
    ],
  );
  assert.deepEqual(SAFETY_CASES.slice(-8, -4), TWO_AXIS_CASES.map((c) => c.case));
  // 61 câu Demo 2 + 4 câu lúc luyện (mục 2.6) + 4 câu hai trục
  assert.equal(SAFETY_CASES.length, 69);
});
