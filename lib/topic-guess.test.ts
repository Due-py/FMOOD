// Mây đoán học sinh đang lo chuyện gì từ tin nhắn (không gọi AI). Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
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
