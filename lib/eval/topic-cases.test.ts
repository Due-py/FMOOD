// Bộ thử chủ đề: đúng cấu trúc, đủ câu, không có câu nguy hiểm. Con số "đoán đúng bao nhiêu" là KẾT QUẢ ĐO
// (hiện ở trang Kết quả), không phải điều test bắt phải đạt. Chạy: npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { guessTopic } from "../topic-guess";
import { TOPIC_CASES } from "./topic-cases";

const ROOT = path.join(import.meta.dirname, "..", "..");
const seed = JSON.parse(readFileSync(path.join(ROOT, "content/vong-ho-tro/noi-dung-mau.json"), "utf8")) as {
  kind: string;
  topic: string | null;
  data: { triggers?: string[] };
}[];
const topics = seed.filter((i) => i.kind === "topic").map((i) => ({ key: i.topic as string, triggers: i.data.triggers ?? [] }));

test("bộ thử chủ đề có ít nhất 20 câu, mỗi chủ đề ít nhất 5 câu, chủ đề đúng là chủ đề có thật", () => {
  assert.ok(TOPIC_CASES.length >= 20);
  const keys = new Set(topics.map((t) => t.key));
  for (const c of TOPIC_CASES) if (c.expected) assert.ok(keys.has(c.expected), c.text);
  for (const k of ["hoc-tap", "ban-be", "gia-dinh", "ban-than", "mang-xa-hoi"])
    assert.ok(TOPIC_CASES.filter((c) => c.expected === k).length >= 5, k);
});

test("bộ thử không chứa cụm từ nguy hiểm", () => {
  const banned = /(chết|tự tử|tự sát|không muốn sống|biến mất|làm hại|rạch|nhảy lầu|thuốc ngủ)/i;
  for (const c of TOPIC_CASES) assert.ok(!banned.test(c.text), c.text);
});

test("chạy được trên chủ đề mẫu (in ra để xem, không bắt phải đạt)", () => {
  const right = TOPIC_CASES.filter((c) => guessTopic(c.text, topics) === c.expected).length;
  console.log(`  đoán đúng ${right}/${TOPIC_CASES.length} câu với cụm từ mẫu`);
  assert.ok(right >= 0);
});
