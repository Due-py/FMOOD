// Số liệu "Vòng hỗ trợ" cho Kết quả nghiên cứu. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { supportLoopStats, type StatsInput } from "./support-stats";

let n = 0;
const worry = (user: string, topic: string, levelStart: number, checks: [number, "better" | "same" | "worse" | "done"][] = []) => ({
  id: `w${++n}`,
  userId: user,
  topic,
  levelStart,
  checks: checks.map(([level, feeling], i) => ({ level, feeling, at: `2026-10-2${i}T00:00:00Z` })),
});

const base: StatsInput = {
  worries: [
    worry("a", "hoc-tap", 4, [[3, "same"], [2, "better"]]), // giảm (lần cuối 2 < 4)
    worry("b", "hoc-tap", 3, [[3, "same"]]), // giữ
    worry("c", "hoc-tap", 2, [[4, "worse"]]), // tăng
    worry("c", "hoc-tap", 5), // chưa được hỏi lại
    worry("d", "ban-be", 4, [[1, "done"]]), // nhóm bạn bè chỉ có 1 học sinh
    worry("e", "hoc-tap", 3), // chưa được hỏi lại
    worry("f", "hoc-tap", 3), // chưa được hỏi lại
  ],
  told: [
    { userId: "a", who: "parent" },
    { userId: "b", who: "parent" },
    { userId: "c", who: "parent" },
    { userId: "c", who: "parent" },
    { userId: "e", who: "parent" },
    { userId: "f", who: "parent" },
    { userId: "a", who: "teacher" },
  ],
  tinyActions: [{ userId: "a" }, { userId: "b" }, { userId: "d" }, { userId: "d" }, { userId: "e" }, { userId: "f" }],
  topicLabels: { "hoc-tap": "Học tập", "ban-be": "Bạn bè" },
};

test("tổng: số chuyện, % được hỏi lại, mức lo giảm / giữ / tăng tính bằng con số lần cuối so với lúc đầu", () => {
  const s = supportLoopStats(base).overall;
  assert.ok(s);
  assert.equal(s.students, 6);
  assert.equal(s.worries, 7);
  assert.equal(s.followedUp, 4);
  assert.deepEqual([s.down, s.same, s.up], [2, 1, 1]);
});

test("mức lo trung bình đầu → lần hỏi lại cuối, chỉ trên các chuyện đã được hỏi lại", () => {
  const s = supportLoopStats(base).overall!;
  assert.equal(s.avgStart, 3.3); // (4+3+2+4)/4 = 3.25
  assert.equal(s.avgLast, 2.5); // (2+3+4+1)/4
});

test("theo chủ đề: nhóm dưới 5 học sinh bị ẩn (null)", () => {
  const byTopic = supportLoopStats(base).byTopic;
  const hoc = byTopic.find((t) => t.topic === "hoc-tap");
  const ban = byTopic.find((t) => t.topic === "ban-be");
  assert.equal(hoc?.label, "Học tập");
  assert.equal(hoc?.stats?.students, 5);
  assert.equal(ban?.stats, null);
});

test("cảm nhận ở lần trả lời cuối của mỗi chuyện được báo cáo riêng", () => {
  assert.deepEqual(supportLoopStats(base).feelings, { better: 1, same: 1, worse: 1, done: 1 });
});

test("đã kể: theo người được kể, ẩn nhóm dưới 5 học sinh", () => {
  const told = supportLoopStats(base).told;
  assert.deepEqual(told.find((t) => t.who === "parent"), { who: "parent", students: 5, times: 6 });
  assert.deepEqual(told.find((t) => t.who === "teacher"), { who: "teacher", students: null, times: null });
});

test("việc nhỏ đã làm: số lượt và số học sinh", () => {
  assert.deepEqual(supportLoopStats(base).tinyActions, { students: 5, times: 6 });
});

test("dưới 5 học sinh có chuyện bận lòng thì ẩn toàn bộ số liệu chuyện bận lòng", () => {
  const few = supportLoopStats({ ...base, worries: base.worries.filter((w) => w.userId !== "e" && w.userId !== "f") });
  assert.equal(few.overall, null);
  assert.equal(few.feelings, null);
  assert.ok(few.byTopic.every((t) => t.stats === null));
});

test("chưa có dữ liệu", () => {
  const empty = supportLoopStats({ worries: [], told: [], tinyActions: [], topicLabels: {} });
  assert.equal(empty.overall, null);
  assert.deepEqual(empty.byTopic, []);
  assert.equal(empty.tinyActions, null);
});
