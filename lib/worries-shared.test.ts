// Quy tắc lưu chuyện bận lòng. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canAnswer,
  FOLLOW_UP_DAYS,
  followupMoment,
  followupNeedsAlert,
  isStale,
  LEVEL_LABELS,
  nextCheckAt,
  nextWorryState,
  validateWorry,
  wantsTopicStep,
  type WorryState,
} from "./worries-shared";

const TOPICS = new Set(["hoc-tap", "ban-be"]);

test("chỉ hỏi chủ đề khi cảm xúc nặng lòng chiếm đa số", () => {
  assert.equal(wantsTopicStep("negative"), true);
  assert.equal(wantsTopicStep("neutral"), false);
  assert.equal(wantsTopicStep("positive"), false);
});

test("hỏi lại sau 3 ngày", () => {
  assert.equal(FOLLOW_UP_DAYS, 3);
  const from = new Date("2026-10-25T10:00:00Z");
  assert.equal(nextCheckAt(from).toISOString(), "2026-10-28T10:00:00.000Z");
});

test("mức lo có 5 bậc, từ hơi lo tới lo rất nhiều", () => {
  assert.equal(LEVEL_LABELS.length, 5);
  assert.equal(LEVEL_LABELS[0], "Hơi lo");
  assert.equal(LEVEL_LABELS[4], "Lo rất nhiều");
});

test("chủ đề phải là chủ đề học sinh đang thấy", () => {
  assert.equal(validateWorry({ topic: "gia-dinh", level: 3 }, TOPICS).ok, false);
  assert.equal(validateWorry({ topic: "hoc-tap", level: 3 }, TOPICS).ok, true);
});

test("mức lo là số nguyên 1–5", () => {
  for (const level of [0, 6, 2.5, Number.NaN]) assert.equal(validateWorry({ topic: "hoc-tap", level }, TOPICS).ok, false, String(level));
});

test("dòng mô tả: bỏ khoảng trắng, để trống thì không lưu, tối đa 200 ký tự", () => {
  const r = validateWorry({ topic: "hoc-tap", level: 2, note: "  mai thi toán  " }, TOPICS);
  assert.deepEqual(r, { ok: true, value: { topic: "hoc-tap", level: 2, note: "mai thi toán" } });
  const blank = validateWorry({ topic: "hoc-tap", level: 2, note: "   " }, TOPICS);
  assert.deepEqual(blank, { ok: true, value: { topic: "hoc-tap", level: 2, note: null } });
  assert.equal(validateWorry({ topic: "hoc-tap", level: 2, note: "a".repeat(201) }, TOPICS).ok, false);
});

// ── Hỏi lại sau 3 ngày ──
const NOW = new Date("2026-10-28T10:00:00Z");
const open = (over: Partial<WorryState> = {}): WorryState => ({
  status: "open",
  levelStart: 4,
  levelNow: 4,
  checksCount: 0,
  nextCheckAt: NOW,
  ...over,
});

test("trả lời hỏi thăm: đếm một lần, ghi mức lo mới, hẹn hỏi lại sau 3 ngày", () => {
  const s = nextWorryState(open(), { level: 3, feeling: "same" }, NOW);
  assert.equal(s.checksCount, 1);
  assert.equal(s.levelNow, 3);
  assert.equal(s.status, "open");
  assert.equal(s.nextCheckAt?.toISOString(), "2026-10-31T10:00:00.000Z");
});

test("Nặng hơn cũng hẹn hỏi lại, không đóng chuyện", () => {
  const s = nextWorryState(open(), { level: 5, feeling: "worse" }, NOW);
  assert.equal(s.status, "open");
  assert.ok(s.nextCheckAt);
});

test("\"Chuyện này xong rồi\" thì đã xong và thôi hỏi", () => {
  const s = nextWorryState(open(), { level: 3, feeling: "done" }, NOW);
  assert.equal(s.status, "done");
  assert.equal(s.nextCheckAt, null);
});

test("mức lo mới ≤ 1 thì đã đỡ và thôi hỏi", () => {
  const s = nextWorryState(open(), { level: 1, feeling: "better" }, NOW);
  assert.equal(s.status, "better");
  assert.equal(s.nextCheckAt, null);
});

test("tối đa 3 lần trả lời: sau lần thứ 3 thôi hỏi nhưng vẫn đang theo dõi", () => {
  const s = nextWorryState(open({ checksCount: 2 }), { level: 3, feeling: "same" }, NOW);
  assert.equal(s.checksCount, 3);
  assert.equal(s.status, "open");
  assert.equal(s.nextCheckAt, null);
  // tự cập nhật thêm trong Hành trình vẫn được ghi, nhưng không hẹn hỏi nữa
  const again = nextWorryState(s, { level: 2, feeling: "better" }, NOW);
  assert.equal(again.checksCount, 4);
  assert.equal(again.nextCheckAt, null);
});

test("mức lo giảm so với lúc kể thì báo để trao huy hiệu Nhẹ lòng hơn", () => {
  assert.equal(nextWorryState(open(), { level: 3, feeling: "same" }, NOW).levelDropped, true);
  assert.equal(nextWorryState(open(), { level: 4, feeling: "better" }, NOW).levelDropped, false);
  assert.equal(nextWorryState(open(), { level: 5, feeling: "worse" }, NOW).levelDropped, false);
});

test("chọn Nặng hơn thì không trao Nhẹ lòng hơn dù con số thấp hơn (tránh lời khen ngược với cảm nhận)", () => {
  assert.equal(nextWorryState(open(), { level: 3, feeling: "worse" }, NOW).levelDropped, false);
});

test("chuyện lâu không cập nhật được mở lại khi học sinh tự trả lời", () => {
  const s = nextWorryState(open({ status: "stale", nextCheckAt: null }), { level: 3, feeling: "same" }, NOW);
  assert.equal(s.status, "open");
  assert.ok(s.nextCheckAt);
});

test("chỉ trả lời được chuyện đang theo dõi hoặc lâu không cập nhật", () => {
  assert.equal(canAnswer("open"), true);
  assert.equal(canAnswer("stale"), true);
  assert.equal(canAnswer("better"), false);
  assert.equal(canAnswer("done"), false);
});

test("thẻ tới hạn quá 14 ngày không ai trả lời thì lâu không cập nhật", () => {
  assert.equal(isStale(open({ nextCheckAt: new Date("2026-10-14T09:59:00Z") }), NOW), true);
  assert.equal(isStale(open({ nextCheckAt: new Date("2026-10-14T10:01:00Z") }), NOW), false);
  assert.equal(isStale(open({ nextCheckAt: null }), NOW), false);
  assert.equal(isStale(open({ status: "better", nextCheckAt: new Date("2026-01-01T00:00:00Z") }), NOW), false);
});

test("lời Mây theo lựa chọn của học sinh", () => {
  assert.equal(followupMoment("better"), "followup_better");
  assert.equal(followupMoment("done"), "followup_better");
  assert.equal(followupMoment("same"), "followup_same");
  assert.equal(followupMoment("worse"), "followup_worse");
});

test("báo thầy cô khi học sinh chọn Nặng hơn ở mức Lo rất nhiều", () => {
  assert.equal(followupNeedsAlert({ level: 5, feeling: "worse" }), true);
  assert.equal(followupNeedsAlert({ level: 4, feeling: "worse" }), false);
  assert.equal(followupNeedsAlert({ level: 5, feeling: "same" }), false);
  assert.equal(followupNeedsAlert({ level: 5, feeling: "done" }), false);
});
