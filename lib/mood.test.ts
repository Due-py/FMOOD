// Nhóm tâm trạng 1–5 suy ra từ cảm xúc, và chuỗi cho biểu đồ. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { EMOTIONS } from "./emotions";
import { daySeries, daysInMonth, levelShares, mondayIndex, monthlyAverages, moodByDay, moodFromEmotions, summary, weekGrid, yearGrid } from "./mood";

const day = (iso: string) => iso.slice(0, 10);

test("mỗi cảm xúc đã xếp sẵn vào một nhóm 1–5", () => {
  for (const e of EMOTIONS) assert.ok(e.level && e.level >= 1 && e.level <= 5, e.id);
});

test("nhóm của lần check-in: trung bình các nhóm, làm tròn; Chưa rõ thì không có nhóm", () => {
  assert.equal(moodFromEmotions(["hao-hung"]), 5);
  assert.equal(moodFromEmotions(["vui", "lo-lang"]), 3); // (4 + 2) / 2
  assert.equal(moodFromEmotions(["vui", "binh-thuong"]), 4); // 3,5 làm tròn lên
  assert.equal(moodFromEmotions(["cang-thang", "tuc-gian"]), 1);
  assert.equal(moodFromEmotions(["chua-ro"]), null);
  assert.equal(moodFromEmotions([]), null);
});

test("mỗi ngày lấy lần ghi gần nhất; ngày không ghi là null", () => {
  const byDay = moodByDay(
    [
      { at: "2026-11-02T01:00:00Z", emotions: ["buon"] },
      { at: "2026-11-02T09:00:00Z", emotions: ["vui"] },
      { at: "2026-11-04T09:00:00Z", emotions: ["lo-lang"] },
      { at: "2026-11-05T09:00:00Z", emotions: ["chua-ro"] },
    ],
    day,
  );
  assert.deepEqual(daySeries(byDay, "2026-11-02", "2026-11-05"), [
    { day: "2026-11-02", mood: 4 },
    { day: "2026-11-03", mood: null },
    { day: "2026-11-04", mood: 2 },
    { day: "2026-11-05", mood: null },
  ]);
});

test("lịch tháng: hàng là tuần bắt đầu thứ Hai; lưới năm: hàng ngày 1–31, cột tháng", () => {
  assert.equal(mondayIndex("2026-11-02"), 0);
  assert.equal(mondayIndex("2026-11-01"), 6);
  assert.equal(daysInMonth(2026, 2), 28);
  const rows = weekGrid(daySeries(new Map(), "2026-11-01", "2026-11-30"));
  assert.equal(rows.length, 6);
  assert.equal(rows[0][6]?.day, "2026-11-01");
  assert.equal(rows[5][0]?.day, "2026-11-30");
  const y = yearGrid(new Map([["2026-10-03", 5]]), 2026);
  assert.equal(y.length, 31);
  assert.equal(y[2][9], 5); // ngày 3, T10
  assert.equal(y[2][8], null); // ngày 3, T9: có ngày, chưa ghi
  assert.equal(y[29][1], undefined); // 30/2 không có
});

test("trung bình tháng, tỉ lệ tâm trạng (tổng 100%), tóm tắt", () => {
  const byDay = new Map([
    ["2026-09-10", 2],
    ["2026-10-01", 4],
    ["2026-10-02", 5],
    ["2026-11-01", 3],
  ]);
  const m = monthlyAverages(byDay, 2026);
  assert.deepEqual([m[8].mood, m[9].mood, m[10].mood, m[0].mood], [2, 4.5, 3, null]);
  assert.deepEqual(levelShares([2, 3, 4]), [
    { level: 4, days: 1, percent: 34 },
    { level: 3, days: 1, percent: 33 },
    { level: 2, days: 1, percent: 33 },
  ]);
  assert.equal(levelShares([2, 3, 4]).reduce((a, s) => a + s.percent, 0), 100);
  assert.deepEqual(levelShares([]), []);
  assert.deepEqual(summary([{ mood: 2 }, { mood: null }, { mood: 5 }]), { days: 2, avg: 3.5 });
});
