// Nút trong trò chuyện và lúc Mây xin xác nhận khó khăn. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { CORRECTION_ASK, SKIP_MESSAGE, STOP_LINE, TOPIC_NO_ASK, wantsSummary } from "./chat-loop";

const base = { turn: null, linkedToWorry: true, hasConfirmed: false, userTurns: 2, alreadyAsked: false, stopped: false } as const;

test("sau khi bấm Mây hiểu chưa đúng và nói lại: luôn xin xác nhận cách hiểu mới", () => {
  assert.equal(wantsSummary({ ...base, turn: "correction", linkedToWorry: false, userTurns: 1 }), true);
  assert.equal(wantsSummary({ ...base, turn: "correction", hasConfirmed: true, alreadyAsked: true }), true);
});

test("chuyện bận lòng chưa có khó khăn xác nhận: hỏi một lần, sau ít nhất 2 lượt kể", () => {
  assert.equal(wantsSummary({ ...base, userTurns: 1 }), false);
  assert.equal(wantsSummary(base), true);
  assert.equal(wantsSummary({ ...base, alreadyAsked: true }), false);
  assert.equal(wantsSummary({ ...base, hasConfirmed: true }), false);
  assert.equal(wantsSummary({ ...base, linkedToWorry: false }), false);
});

test("Bỏ qua hoặc Dừng: không hỏi dồn", () => {
  assert.equal(wantsSummary({ ...base, turn: "skip" }), false);
  assert.equal(wantsSummary({ ...base, stopped: true }), false);
  assert.equal(wantsSummary({ ...base, turn: "correction", stopped: true }), false);
});

test("lời soạn sẵn: xưng mình, gọi bạn, không gọi em, Dừng không đặt câu hỏi", () => {
  for (const line of [STOP_LINE, CORRECTION_ASK, TOPIC_NO_ASK, SKIP_MESSAGE]) {
    assert.ok(!/(^|[^\p{L}])em([^\p{L}]|$)/iu.test(line), line);
  }
  assert.ok(!STOP_LINE.includes("?"), "Dừng thì không hỏi thêm");
  assert.ok(CORRECTION_ASK.includes("?") && TOPIC_NO_ASK.includes("?"));
});

import { cleanSummary } from "./chat-loop";

test("câu tóm tắt: bỏ câu hỏi lại ở cuối, ngoặc kép và dấu chấm (thẻ đã tự hỏi “đúng chưa?”)", () => {
  assert.equal(
    cleanSummary("bạn đã học rồi nhưng sợ lúc làm bài ngày mai sẽ quên công thức, mình hiểu vậy đúng chưa?"),
    "bạn đã học rồi nhưng sợ lúc làm bài ngày mai sẽ quên công thức",
  );
  assert.equal(cleanSummary("“bạn chưa hiểu bài phân số.”"), "bạn chưa hiểu bài phân số");
  assert.equal(cleanSummary("bạn sợ bị bỏ rơi, đúng không?"), "bạn sợ bị bỏ rơi");
  assert.equal(cleanSummary("bạn lo vì đúng hẹn mà bạn ấy không tới"), "bạn lo vì đúng hẹn mà bạn ấy không tới");
});
