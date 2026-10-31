// Đường đi của một lượt trò chuyện: bốn đường không qua bộ điều phối SEL vẫn giữ lớp an toàn, và AI phân loại lỗi
// không trở về trò chuyện tự do. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { engineAllowed, needsClassifier, replyPath } from "./turn-path";

test("lượt học sinh tự viết, bộ điều phối bật: AI phân loại chạy, đi theo bước", () => {
  assert.equal(needsClassifier("none", undefined, false), true);
  assert.equal(engineAllowed("none", undefined, false), true);
  assert.equal(replyPath({ level: "none", afterCrisis: false, engine: true, hasSel: true }), "theo-buoc");
});

test("đường 1, lượt bấm nút: không qua bộ điều phối; \"… hiểu chưa đúng\" vẫn được AI phân loại", () => {
  assert.equal(engineAllowed("none", "correction", false), false);
  assert.equal(needsClassifier("none", "correction", false), true);
  // "Bỏ qua" gửi câu soạn sẵn: chỉ lớp từ khóa (không chấm lại bối cảnh cũ)
  assert.equal(needsClassifier("none", "skip", true), false);
  // "Bỏ qua" mà nội dung không phải câu soạn sẵn thì vẫn chấm
  assert.equal(needsClassifier("none", "skip", false), true);
  assert.equal(replyPath({ level: "none", afterCrisis: false, engine: false, hasSel: true }), "loi-dan");
  assert.equal(replyPath({ level: "concern", afterCrisis: false, engine: false, hasSel: true }), "dang-lo");
});

test("đường 2, hỏi bài tập: không qua bộ điều phối, vẫn AI phân loại, đáng lo vẫn đi đường đáng lo", () => {
  assert.equal(engineAllowed("none", undefined, true), false);
  assert.equal(needsClassifier("none", undefined, false), true);
  assert.equal(replyPath({ level: "concern", afterCrisis: false, engine: false, hasSel: true }), "dang-lo");
});

test("đường 3, admin tắt bộ điều phối: chỉ lời dặn, mọi mức an toàn giữ nguyên", () => {
  assert.equal(replyPath({ level: "none", afterCrisis: false, engine: false, hasSel: true }), "loi-dan");
  assert.equal(replyPath({ level: "concern", afterCrisis: false, engine: false, hasSel: true }), "dang-lo");
  assert.equal(replyPath({ level: "urgent", afterCrisis: false, engine: false, hasSel: true }), "khan-cap");
  // vừa có lúc khẩn cấp trong cuộc trò chuyện: tiếp tục giọng đáng lo
  assert.equal(replyPath({ level: "none", afterCrisis: true, engine: false, hasSel: true }), "dang-lo");
});

test("đường 4, AI phân loại lỗi: không trở về trò chuyện tự do", () => {
  // check.ts / route.ts: lỗi phân loại thì mức là "đáng lo" (kèm lý do "Chưa kiểm tra được bằng AI…"), không có nhận diện lượt
  assert.equal(replyPath({ level: "concern", afterCrisis: false, engine: true, hasSel: false }), "dang-lo");
  // dù mức là "ổn" mà bật bộ điều phối và thiếu nhận diện lượt: vẫn đường đáng lo
  assert.equal(replyPath({ level: "none", afterCrisis: false, engine: true, hasSel: false }), "dang-lo");
});

test("từ khóa khẩn cấp: không chờ AI, không bộ điều phối, câu soạn sẵn", () => {
  assert.equal(needsClassifier("urgent", undefined, false), false);
  assert.equal(engineAllowed("urgent", undefined, false), false);
  for (const engine of [true, false]) assert.equal(replyPath({ level: "urgent", afterCrisis: false, engine, hasSel: false }), "khan-cap");
});
