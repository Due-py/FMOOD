// Trợ lý đoán học sinh đang lo chuyện gì từ tin nhắn (không gọi AI). Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { guessTopic } from "./topic-guess";

const TOPICS = [
  { key: "hoc-tap", triggers: ["bài kiểm tra", "kiểm tra", "thi", "điểm kém", "bài tập"] },
  { key: "ban-be", triggers: ["bạn thân", "không ai chơi", "nói xấu"] },
  { key: "gia-dinh", triggers: ["bố mẹ", "bị mắng", "bố", "mẹ"] },
  { key: "khac", triggers: ["chuyện khác", "rối quá"] },
];

test("đoán đúng chủ đề khi gõ có dấu", () => {
  assert.equal(guessTopic("mai thi toán mà mình chưa ôn", TOPICS), "hoc-tap");
  assert.equal(guessTopic("bố mẹ mình lại cãi nhau", TOPICS), "gia-dinh");
});

test("đoán đúng khi gõ không dấu hoặc viết tắt", () => {
  assert.equal(guessTopic("mai thi toan ma minh chua on", TOPICS), "hoc-tap");
  assert.equal(guessTopic("k ai choi voi mk ca", TOPICS), "ban-be");
});

test("chữ có dấu khác nghĩa không bị nhầm: \"thì\" không phải \"thi\"", () => {
  assert.equal(guessTopic("mình thì thấy hơi buồn thôi", TOPICS), null);
});

test("không đoán chủ đề \"Chuyện khác\" và không đoán khi không khớp gì", () => {
  assert.equal(guessTopic("rối quá đi mất", TOPICS), null);
  assert.equal(guessTopic("hôm nay trời đẹp ghê", TOPICS), null);
});

test("khớp nhiều cụm hơn thì thắng", () => {
  assert.equal(guessTopic("bị bố mắng vì bài kiểm tra điểm kém", TOPICS), "hoc-tap");
});

test("dòng không có mã chủ đề (việc nhỏ dùng chung) không bao giờ được đoán", () => {
  const withGeneral = [...TOPICS, { key: null as unknown as string, triggers: ["điểm tốt", "vui"] }];
  assert.equal(guessTopic("Hôm nay mình được điểm tốt", withGeneral), null);
  assert.equal(guessTopic("bố mẹ khen mình được điểm tốt", withGeneral), "gia-dinh");
});

// nội dung mẫu thật (content/vong-ho-tro/noi-dung-mau.json): cụm một chữ như "xấu", "thi", "bố" không khớp nhầm từ ghép
const SEED = (JSON.parse(readFileSync(path.join(import.meta.dirname, "..", "content", "vong-ho-tro", "noi-dung-mau.json"), "utf8")) as {
  kind: string;
  topic: string;
  data: { triggers?: string[] };
}[])
  .filter((i) => i.kind === "topic")
  .map((i) => ({ key: i.topic, triggers: i.data.triggers ?? [] }));

test("cụm một chữ không khớp khi là phần đầu của từ ghép khác nghĩa (có dấu và không dấu)", () => {
  assert.notEqual(guessTopic("mình cảm thấy xấu hổ khi phát biểu ở trên lớp rồi bị bạn chê", SEED), "ban-than");
  assert.notEqual(guessTopic("minh thay xau ho khi phat bieu", SEED), "ban-than");
  assert.notEqual(guessTopic("lớp mình đang thi đua hoa điểm mười", SEED), "hoc-tap");
  assert.notEqual(guessTopic("cô bảo bố cục bài văn của mình chưa ổn", SEED), "gia-dinh");
});

test("cụm một chữ vẫn khớp khi đứng riêng", () => {
  assert.equal(guessTopic("dạo này mình thấy mình xấu quá", SEED), "ban-than");
  assert.equal(guessTopic("mai thi toán rồi", SEED), "hoc-tap");
  assert.equal(guessTopic("bố mình hay mắng mình", SEED), "gia-dinh");
});
