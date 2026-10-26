import assert from "node:assert/strict";
import { test } from "node:test";
import { challengeEndsOn, challengeSchema, classLabel, challengeStats, commonWorries, isChallengeOpen, weekPulse } from "./class-tools";

const users = (n: number, prefix = "u") => Array.from({ length: n }, (_, i) => `${prefix}${i}`);

test("thử thách kéo dài đúng 1 hoặc 2 tuần tính cả hôm nay", () => {
  assert.equal(challengeEndsOn("2026-10-26", 1), "2026-11-01");
  assert.equal(challengeEndsOn("2026-10-26", 2), "2026-11-08");
});

test("thử thách đang mở tới hết ngày kết thúc", () => {
  const c = { status: "open" as const, ends_on: "2026-11-01" };
  assert.equal(isChallengeOpen(c, "2026-11-01"), true);
  assert.equal(isChallengeOpen(c, "2026-11-02"), false);
  assert.equal(isChallengeOpen({ ...c, status: "closed" }, "2026-10-27"), false);
});

test("thử thách: dưới 5 bạn tham gia thì ẩn cả số bạn lẫn số lượt", () => {
  assert.deepEqual(challengeStats(users(4).map((userId) => ({ userId, logs: 3 }))), { joined: null, doneTimes: null });
  assert.deepEqual(challengeStats(users(5).map((userId, i) => ({ userId, logs: i }))), { joined: 5, doneTimes: 10 });
});

test("thử thách: một bạn tham gia hai lần chỉ tính một bạn", () => {
  const rows = [...users(5).map((userId) => ({ userId, logs: 1 })), { userId: "u0", logs: 2 }];
  assert.deepEqual(challengeStats(rows), { joined: 5, doneTimes: 7 });
});

test("thử thách: tên quá ngắn hoặc biểu tượng lạ bị chặn", () => {
  assert.equal(challengeSchema.safeParse({ title: "Uống nước", icon: "💧", description: "", weeks: 1 }).success, true);
  assert.equal(challengeSchema.safeParse({ title: "ab", icon: "💧", description: "", weeks: 1 }).success, false);
  assert.equal(challengeSchema.safeParse({ title: "Uống nước", icon: "<b>", description: "", weeks: 1 }).success, false);
  assert.equal(challengeSchema.safeParse({ title: "Uống nước", icon: "💧", description: "", weeks: 3 }).success, false);
});

function checkins(day: string, us: string[], group: "positive" | "neutral" | "negative") {
  return us.map((user_id) => ({ user_id, day, groups: [group] }));
}

test("nhịp lớp: đủ 5 bạn mỗi tuần thì so được với tuần trước", () => {
  const rows = [
    ...checkins("2026-10-15", users(5), "negative"),
    ...checkins("2026-10-24", users(5), "positive"),
  ];
  const p = weekPulse(rows, "2026-10-26");
  assert.equal(p.thisWeek.participants, 5);
  assert.equal(p.thisWeek.share?.positive, 100);
  assert.equal(p.lastWeek.share?.negative, 100);
  assert.equal(p.change, "better");
});

test("nhịp lớp: tuần nào dưới 5 bạn thì ẩn tỉ lệ và không so sánh", () => {
  const rows = [...checkins("2026-10-15", users(4), "negative"), ...checkins("2026-10-24", users(6), "positive")];
  const p = weekPulse(rows, "2026-10-26");
  assert.equal(p.lastWeek.share, null);
  assert.equal(p.thisWeek.share?.positive, 100);
  assert.equal(p.change, null);
});

test("nhịp lớp: chênh dưới 10 điểm nặng lòng thì coi là như cũ", () => {
  const last = [...checkins("2026-10-15", users(5), "neutral"), ...checkins("2026-10-15", ["x1"], "negative")];
  const now = [...checkins("2026-10-25", users(5), "neutral"), ...checkins("2026-10-25", ["x1"], "negative")];
  assert.equal(weekPulse([...last, ...now], "2026-10-26").change, "same");
});

test("chuyện bận lòng chung: chỉ hiện chủ đề có từ 5 bạn trở lên, đếm theo bạn", () => {
  const rows = [
    ...users(6).map((user_id) => ({ user_id, topic: "Học tập" })),
    { user_id: "u0", topic: "Học tập" },
    ...users(4).map((user_id) => ({ user_id, topic: "Bạn bè" })),
  ];
  const r = commonWorries(rows);
  assert.deepEqual(r.shown, [{ topic: "Học tập", students: 6 }]);
  assert.equal(r.hiddenTopics, 1);
});

test("tên lớp không bị lặp chữ 'Lớp'", () => {
  assert.equal(classLabel("7A"), "Lớp 7A");
  assert.equal(classLabel("Lớp chạy thử"), "Lớp chạy thử");
  assert.equal(classLabel("lớp 8B"), "lớp 8B");
});
