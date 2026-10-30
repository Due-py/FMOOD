// Kiểm tra câu trả lời của Mây trước khi hiện. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { guardReply, lastSentenceEnd } from "./reply-guard";

const blocked = (text: string) => guardReply(text).reasons;

test("câu trả lời bình thường đi qua", () => {
  for (const ok of [
    "Nghe có vẻ bạn đang rất lo vì bài kiểm tra Toán. Bạn lo nhất phần nào?",
    "Bị trêu như vậy không phải lỗi của bạn. Bạn thử kể với cô chủ nhiệm hoặc phòng tham vấn nhé, bạn có muốn mình gợi ý cách mở lời không?",
    "Mình là AI nên có thể trả lời chưa đúng. Bạn muốn kể tiếp không?",
    "Nếu muốn, bạn bấm Cần giúp để tự gửi lời hẹn cho thầy cô nhé.",
    "Ngủ đủ giấc giúp đầu óc tỉnh táo hơn. Tối nay bạn thử đi ngủ sớm 15 phút nhé?",
  ]) {
    assert.deepEqual(blocked(ok), [], ok);
  }
});

test("chặn câu hứa đã báo thầy cô hoặc có người đang đến (QT11)", () => {
  assert.deepEqual(blocked("Mình đã báo cho cô chủ nhiệm rồi, bạn yên tâm nhé."), ["hua-da-bao"]);
  assert.deepEqual(blocked("Thầy cô đang đến ngay đây."), ["hua-da-bao"]);
  assert.deepEqual(blocked("Mình sẽ nhắn cho phòng tham vấn giúp bạn."), ["hua-da-bao"]);
});

test("chặn câu chẩn đoán, tên thuốc, hứa bí mật, xin thông tin, hướng dẫn nguy hiểm", () => {
  assert.deepEqual(blocked("Có lẽ bạn bị trầm cảm rồi."), ["chan-doan"]);
  assert.deepEqual(blocked("Bạn thử uống thuốc ngủ xem sao."), ["ten-thuoc"]);
  assert.deepEqual(blocked("Mình hứa không nói với ai đâu."), ["hua-bi-mat"]);
  assert.deepEqual(blocked("Bạn cho mình biết số điện thoại để mình hỏi thăm nhé."), ["xin-thong-tin"]);
  assert.deepEqual(blocked("Đây là cách để tự làm hại mà không ai biết."), ["huong-dan-nguy-hiem"]);
});

test("cắt theo câu để gửi dần", () => {
  assert.equal(lastSentenceEnd("Chưa hết câu"), -1);
  const t = "Câu một. Câu hai? Đang viết";
  assert.equal(t.slice(0, lastSentenceEnd(t)), "Câu một. Câu hai? ");
  const q = "Bạn nói “mình mệt”. Tiếp";
  assert.equal(q.slice(0, lastSentenceEnd(q)), "Bạn nói “mình mệt”. ");
});
