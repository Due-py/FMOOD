// Trang Thói quen: số tuần, nhãn trạng thái, lịch 4 tuần, số liệu "Nhìn lại". Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays } from "./dates";
import {
  ADJUST_TIPS,
  calendar,
  checkAdjust,
  checkQuestion,
  factLines,
  fallbackQuestion,
  habitFacts,
  mondayOf,
  sortForToday,
  STATUS_LABEL,
  summarize,
  type HabitDays,
} from "./habits-shared";

// 31/10/2026 là Thứ Bảy; tuần này bắt đầu Thứ Hai 26/10
const TODAY = "2026-10-31";
const range = (from: string, to: string) => {
  const out: string[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k);
  return out;
};
const habit = (done: string[], startDay = "2026-10-01"): HabitDays => ({
  id: "h",
  title: "Đọc sách 15 phút",
  icon: "📚",
  startDay,
  today: TODAY,
  done,
  total: done.length,
});

test("tuần tính từ Thứ Hai", () => {
  assert.equal(mondayOf("2026-10-31"), "2026-10-26");
  assert.equal(mondayOf("2026-10-26"), "2026-10-26");
  assert.equal(mondayOf("2026-11-01"), "2026-10-26");
});

test("câu trạng thái: tuần này / tuần trước theo tuần lịch", () => {
  const s = summarize(habit(["2026-10-26", "2026-10-28", "2026-10-31", ...range("2026-10-19", "2026-10-23")]));
  assert.equal(s.thisWeek, 3);
  assert.equal(s.lastWeek, 5);
  assert.equal(s.line, "Tuần này 3/7 · tuần trước 5/7");
});

test("thói quen mới (chưa có tuần trước): không nói tuần trước, nhãn Mới bắt đầu", () => {
  const s = summarize(habit(["2026-10-29", "2026-10-30"], "2026-10-29"));
  assert.equal(s.lastWeek, null);
  assert.equal(s.line, "Tuần này 2/7");
  assert.equal(s.status, "new");
  // tạo đúng 7 ngày trước thì không còn "mới"
  assert.notEqual(summarize(habit([], addDays(TODAY, -7))).status, "new");
  assert.equal(summarize(habit([], addDays(TODAY, -6))).status, "new");
});

test("Đang đều: ≥ 5 trong 7 ngày gần nhất", () => {
  assert.equal(summarize(habit(range("2026-10-27", "2026-10-31"))).status, "steady");
  assert.equal(summarize(habit(range("2026-10-25", "2026-10-29"))).status, "steady");
  assert.notEqual(summarize(habit(range("2026-10-28", "2026-10-31"))).status, "steady");
});

test("Đang lấy lại nhịp: hôm qua và hôm kia đều chưa làm; hôm nay chưa làm thì không tính là lỡ", () => {
  assert.equal(summarize(habit(["2026-10-26", "2026-10-27"])).status, "regaining");
  assert.equal(summarize(habit(["2026-10-26", "2026-10-27", TODAY])).status, "regaining");
  assert.equal(summarize(habit(["2026-10-26", "2026-10-30"])).status, null);
  assert.equal(summarize(habit(["2026-10-29"])).status, null);
});

test("chưa làm hôm nay xếp lên đầu, giữ thứ tự tạo", () => {
  const list = [
    { id: "a", doneToday: true },
    { id: "b", doneToday: false },
    { id: "c", doneToday: true },
    { id: "d", doneToday: false },
  ];
  assert.deepEqual(sortForToday(list).map((h) => h.id), ["b", "d", "a", "c"]);
});

test("lịch 4 tuần: cột cố định T2…CN, ngày chưa tới, trước khi bắt đầu, số ngày mỗi tuần", () => {
  const weeks = calendar(habit(["2026-10-06", "2026-10-07", "2026-10-26", TODAY], "2026-10-06"));
  assert.equal(weeks.length, 4);
  assert.deepEqual(weeks.map((w) => w.monday), ["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"]);
  assert.deepEqual(weeks.map((w) => w.label), ["Từ 5/10", "Từ 12/10", "Tuần trước", "Tuần này"]);
  assert.ok(weeks.every((w) => w.days.length === 7));
  assert.equal(weeks[0].days[0].state, "before");
  assert.equal(weeks[0].days[1].state, "done");
  assert.equal(weeks[0].count, 2);
  assert.equal(weeks[3].days[5].today, true);
  assert.equal(weeks[3].days[5].state, "done");
  assert.equal(weeks[3].days[6].state, "future");
  assert.equal(weeks[1].days[0].state, "open");
  assert.equal(weeks[3].count, 2);
});

test("số liệu nhìn lại: thứ hay làm được / hay chưa làm, chỉ xét ngày đã qua", () => {
  // làm mọi ngày trừ Thứ Ba, Thứ Năm, suốt 4 tuần
  const days = range("2026-10-01", TODAY).filter((k) => !["2026-10-06", "2026-10-08", "2026-10-13", "2026-10-15", "2026-10-20", "2026-10-22", "2026-10-27", "2026-10-29"].includes(k));
  const f = habitFacts(habit(days));
  assert.deepEqual(f.oftenOpen, ["T3", "T5"]);
  assert.deepEqual(f.oftenDone, ["T2", "T4", "T6", "T7", "CN"]);
  assert.equal(f.span, 28);
  assert.deepEqual(factLines(f), [
    "Tuần này 4/7 ngày, tuần trước 5/7 ngày.",
    "4 tuần gần đây: 20/28 ngày.",
    "Hôm thường làm được: T2, T4, T6, T7, CN.",
    "Hôm thường chưa làm: T3, T5.",
  ]);
  assert.equal(fallbackQuestion(f), "Những hôm Thứ Ba và Thứ Năm thường có gì khác với các hôm còn lại?");
});

test("số liệu nhìn lại của thói quen mới: nói số ngày từ khi bắt đầu, câu hỏi chung", () => {
  const f = habitFacts(habit(["2026-10-29", "2026-10-30"], "2026-10-29"));
  assert.equal(f.span, 3);
  assert.deepEqual(f.oftenOpen, []);
  assert.deepEqual(factLines(f), ["Tuần này 2/7 ngày.", "Từ khi bắt đầu (3 ngày): 2 ngày."]);
  assert.match(fallbackQuestion(f), /\?$/);
});

test("chữ app tự viết: không trách, không nói chuỗi, không gọi em", () => {
  const f = habitFacts(habit(range("2026-10-01", "2026-10-20")));
  const lines = [
    ...Object.values(STATUS_LABEL),
    ...factLines(f),
    fallbackQuestion(f),
    fallbackQuestion({ ...f, oftenOpen: [] }),
    fallbackQuestion({ ...f, oftenOpen: [], oftenDone: [] }),
    ...ADJUST_TIPS.flatMap((t) => [t.title, t.text]),
  ];
  for (const line of lines) {
    assert.ok(!/(mất chuỗi|chuỗi|sao bạn|bỏ lỡ|lười|thất bại|các bạn khác|phải|nên)/iu.test(line), line);
    assert.ok(!/(^|[^\p{L}])em([^\p{L}]|$)/iu.test(line), line);
  }
});

test("câu hỏi AI viết: một câu hỏi, không trách; sai thì bỏ", () => {
  assert.equal(checkQuestion("  Thứ Ba và Thứ Năm có gì khác?  "), "Thứ Ba và Thứ Năm có gì khác?");
  assert.equal(checkQuestion("Sao bạn lại bỏ lỡ Thứ Ba?"), null);
  assert.equal(checkQuestion("Bạn mất chuỗi rồi, hôm đó có gì khác?"), null);
  assert.equal(checkQuestion("Hôm đó thế nào? Có mệt không?"), null);
  assert.equal(checkQuestion("Hôm đó có gì khác."), null);
  assert.equal(checkQuestion("Em thấy Thứ Ba có gì khác?"), null);
  assert.equal(checkQuestion("Có phải bạn đang bị trầm cảm không?"), null);
  assert.equal(checkQuestion(42), null);
});

test("gợi ý AI viết: đúng loại, tên mới hợp lệ và khác tên cũ", () => {
  const ok = { kind: "nho-lai", text: "Thử đọc 3 trang thôi, hôm mệt vẫn làm được.", newTitle: "Đọc 3 trang sách" };
  assert.deepEqual(checkAdjust(ok, "Đọc sách 15 phút"), ok);
  assert.equal(checkAdjust({ ...ok, kind: "khac" }, "Đọc sách 15 phút"), null);
  assert.equal(checkAdjust({ ...ok, newTitle: "đọc sách 15 phút" }, "Đọc sách 15 phút"), null);
  assert.equal(checkAdjust({ ...ok, newTitle: "x".repeat(61) }, "Đọc sách 15 phút"), null);
  assert.equal(checkAdjust({ ...ok, text: "Bạn lười quá, đọc 3 trang thôi." }, "Đọc sách 15 phút"), null);
  assert.equal(checkAdjust(null, "Đọc sách 15 phút"), null);
});
