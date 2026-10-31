// Mức tâm trạng 1–5 và chuỗi cho biểu đồ. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { checkinMood, daySeries, daysInMonth, mondayIndex, moodByDay, summary, weekGrid, weeklyAverages } from "./mood";

const day = (iso: string) => iso.slice(0, 10);

test("mức của một lần ghi: mức học sinh chọn; check-in cũ thì ước tính từ cảm xúc; Chưa rõ thì không ước tính", () => {
  assert.deepEqual(checkinMood({ mood: 2, emotions: ["vui"] }), { mood: 2, estimated: false });
  assert.deepEqual(checkinMood({ mood: null, emotions: ["vui"] }), { mood: 4, estimated: true });
  assert.deepEqual(checkinMood({ emotions: ["lo-lang", "met"] }), { mood: 2, estimated: true });
  assert.deepEqual(checkinMood({ emotions: ["met"] }), { mood: 3, estimated: true });
  assert.equal(checkinMood({ emotions: ["chua-ro"] }), null);
  assert.equal(checkinMood({ mood: 7, emotions: [] }), null);
});

test("mỗi ngày lấy lần ghi gần nhất; ngày không ghi là null", () => {
  const byDay = moodByDay(
    [
      { at: "2026-11-02T01:00:00Z", mood: 2, emotions: ["buon"] },
      { at: "2026-11-02T09:00:00Z", mood: 4, emotions: ["vui"] },
      { at: "2026-11-04T09:00:00Z", mood: null, emotions: ["lo-lang"] },
    ],
    day,
  );
  assert.deepEqual(daySeries(byDay, "2026-11-02", "2026-11-04"), [
    { day: "2026-11-02", mood: 4, estimated: false },
    { day: "2026-11-03", mood: null, estimated: false },
    { day: "2026-11-04", mood: 2, estimated: true },
  ]);
});

test("lưới heatmap: cột là tuần bắt đầu thứ Hai, ô ngoài khoảng là null", () => {
  assert.equal(mondayIndex("2026-11-02"), 0); // thứ Hai
  assert.equal(mondayIndex("2026-11-01"), 6); // Chủ nhật
  assert.equal(daysInMonth(2026, 2), 28);
  const pts = daySeries(new Map(), "2026-11-01", "2026-11-30");
  const grid = weekGrid(pts);
  assert.equal(grid.length, 6);
  assert.equal(grid[0].filter(Boolean).length, 1); // 01/11 là Chủ nhật: cột đầu chỉ có một ngày, ở hàng cuối
  assert.equal(grid[0][6]?.day, "2026-11-01");
  assert.equal(grid[5][0]?.day, "2026-11-30");
  assert.ok(grid.every((c) => c.length === 7));
});

test("đường cả năm: trung bình mỗi tuần; tóm tắt có số ngày, trung bình, có ước tính không", () => {
  const byDay = new Map([
    ["2026-11-02", { mood: 2, estimated: false }],
    ["2026-11-03", { mood: 5, estimated: false }],
    ["2026-11-10", { mood: 3, estimated: true }],
  ]);
  const pts = daySeries(byDay, "2026-11-02", "2026-11-22");
  assert.deepEqual(
    weeklyAverages(pts).map((w) => [w.from, w.mood, w.days]),
    [
      ["2026-11-02", 3.5, 2],
      ["2026-11-09", 3, 1],
      ["2026-11-16", null, 0],
    ],
  );
  assert.deepEqual(summary(pts), { days: 3, avg: 3.3, estimated: true });
  assert.deepEqual(summary([]), { days: 0, avg: null, estimated: false });
});
