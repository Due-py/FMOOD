// 10 chỉ số hiệu quả: mỗi test dùng dữ liệu mẫu có đáp án tính tay ghi bên cạnh. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  asReference,
  falseAlarms,
  GROUPS,
  helpResponse,
  METRIC_GROUP,
  notMeasured,
  practiceDone,
  practiceRevised,
  replyQuality,
  retentionWeek1,
  safetyCatch,
  surveyMetric,
  teacherResponse,
  topicGuessing,
  worriesLighter,
} from "./metrics";
import type { SurveyPair } from "./survey";

const cases = (expected: string, got: string, n: number) => Array.from({ length: n }, () => ({ expected, got }));

test("1. không bỏ sót: bắt đủ 100% câu khẩn cấp và ≥ 95% câu đáng lo thì Đạt", () => {
  const run = { cases: [...cases("urgent", "urgent", 8), ...cases("concern", "concern", 3), ...cases("concern", "urgent", 1)] };
  const m = safetyCatch(run);
  assert.equal(m.status, "dat");
  assert.match(m.value, /8\/8.*4\/4/);
  assert.match(m.basis, /12 câu/);
});

test("1. chỉ cần sót 1 câu khẩn cấp là Chưa đạt", () => {
  const run = { cases: [...cases("urgent", "urgent", 9), ...cases("urgent", "concern", 1), ...cases("concern", "concern", 5)] };
  assert.equal(safetyCatch(run).status, "chua-dat");
});

test("1. dưới 10 câu nguy hiểm, hoặc chưa chạy bộ thử: chưa đủ dữ liệu", () => {
  assert.equal(safetyCatch({ cases: cases("urgent", "urgent", 9) }).status, "chua-du");
  assert.equal(safetyCatch(null).status, "chua-du");
});

test("2. báo nhầm: 1/20 câu bình thường bị báo (5%) ≤ 10% thì Đạt; 3/20 (15%) thì Chưa đạt", () => {
  const ok = falseAlarms({ cases: [...cases("none", "none", 19), ...cases("none", "concern", 1)] });
  assert.equal(ok.status, "dat");
  assert.match(ok.value, /1\/20.*5%/);
  assert.equal(falseAlarms({ cases: [...cases("none", "none", 17), ...cases("none", "urgent", 3)] }).status, "chua-dat");
});

test("3. đoán chủ đề: 17/20 = 85% ≥ 80% thì Đạt; học sinh thật trả lời dưới 5 bạn thì chỉ ghi chưa đủ", () => {
  const set = [
    ...Array.from({ length: 17 }, () => ({ expected: "hoc-tap", got: "hoc-tap" })),
    ...Array.from({ length: 3 }, () => ({ expected: "ban-be", got: null })),
  ];
  const m = topicGuessing(set, { students: 3, yes: 3, no: 0 });
  assert.equal(m.status, "dat");
  assert.match(m.value, /17\/20.*85%/);
  assert.match(m.extra ?? "", /chưa đủ/i);
});

test("3. giai đoạn 2: học sinh thật bấm 'Đúng rồi' 6/10 = 60% < 70% thì Chưa đạt dù bộ thử đạt", () => {
  const set = Array.from({ length: 20 }, () => ({ expected: "hoc-tap", got: "hoc-tap" }));
  assert.equal(topicGuessing(set, { students: 6, yes: 6, no: 4 }, 2).status, "chua-dat");
});

test("3. giai đoạn 1: 6/10 = 60% ≥ 60% thì Đạt, 5/10 thì Chưa đạt; mục tiêu ghi cả đích cuối 70%", () => {
  const set = Array.from({ length: 20 }, () => ({ expected: "hoc-tap", got: "hoc-tap" }));
  const m = topicGuessing(set, { students: 6, yes: 6, no: 4 }, 1);
  assert.equal(m.status, "dat");
  assert.match(m.target, /60%/);
  assert.match(m.finalTarget ?? "", /70%/);
  assert.equal(topicGuessing(set, { students: 6, yes: 5, no: 5 }, 1).status, "chua-dat");
});

test("3. giai đoạn 1: bộ thử 14/20 = 70% thì Đạt, 13/20 thì Chưa đạt; giai đoạn 2 cần 80%", () => {
  const set = (right: number) => Array.from({ length: 20 }, (_, i) => ({ expected: "hoc-tap", got: i < right ? "hoc-tap" : null }));
  const live = { students: 6, yes: 7, no: 3 };
  const m = topicGuessing(set(14), live, 1);
  assert.equal(m.status, "dat");
  assert.match(m.target, /70% câu trong bộ thử.*60%/);
  assert.match(m.finalTarget ?? "", /80% câu trong bộ thử.*70%/);
  assert.equal(topicGuessing(set(13), live, 1).status, "chua-dat");
  assert.equal(topicGuessing(set(14), live, 2).status, "chua-dat");
});

test("4. giai đoạn 2: câu trả lời 18/20 = 90% thì Đạt; 17/20 thì Chưa đạt; dưới 15 câu thì chưa đủ", () => {
  assert.equal(replyQuality({ total: 20, passed: 18 }, 2).status, "dat");
  assert.equal(replyQuality({ total: 20, passed: 17 }, 2).status, "chua-dat");
  assert.equal(replyQuality({ total: 10, passed: 10 }, 2).status, "chua-du");
});

test("4. giai đoạn 1: 16/20 = 80% thì Đạt, 15/20 thì Chưa đạt", () => {
  assert.equal(replyQuality({ total: 20, passed: 16 }, 1).status, "dat");
  assert.equal(replyQuality({ total: 20, passed: 15 }, 1).status, "chua-dat");
});

test("chỉ số không đổi giữa hai giai đoạn thì không có dòng 'đích cuối' riêng", () => {
  assert.equal(safetyCatch(null, 1).finalTarget, undefined);
  assert.equal(falseAlarms(null, 1).finalTarget, undefined);
  assert.equal(worriesLighter([], 1).finalTarget, undefined);
});

const H = 3_600_000;
const NOW = Date.parse("2026-11-10T12:00:00Z");
const alert = (agoH: number, handledAfterH: number | null) => ({
  severity: "urgent" as const,
  created_at: new Date(NOW - agoH * H).toISOString(),
  first_handled_at: handledAfterH === null ? null : new Date(NOW - agoH * H + handledAfterH * H).toISOString(),
});

test("5. thầy cô kịp thời: 9/10 cảnh báo khẩn có người nhận trong 24 giờ = 90% thì Đạt", () => {
  const list = [...Array.from({ length: 9 }, () => alert(48, 2)), alert(72, 30)];
  const m = teacherResponse(list, NOW);
  assert.equal(m.status, "dat");
  assert.match(m.value, /9\/10/);
});

test("5. giai đoạn 1: 5/10 trong 24 giờ và 10/10 trong 72 giờ thì Đạt; một cảnh báo quá 72 giờ thì Chưa đạt", () => {
  const ok = [...Array.from({ length: 5 }, () => alert(100, 2)), ...Array.from({ length: 5 }, () => alert(100, 40))];
  const m = teacherResponse(ok, NOW, 1);
  assert.equal(m.status, "dat");
  assert.match(m.value, /5\/10.*10\/10 trong 72 giờ/);
  assert.match(m.finalTarget ?? "", /90%/);
  const late = [...Array.from({ length: 5 }, () => alert(100, 2)), ...Array.from({ length: 4 }, () => alert(100, 40)), alert(100, 80)];
  assert.equal(teacherResponse(late, NOW, 1).status, "chua-dat");
  assert.equal(teacherResponse(ok, NOW, 2).status, "chua-dat"); // giai đoạn 2 cần 90% trong 24 giờ
});

test("5. cảnh báo chưa đủ 24 giờ và chưa ai nhận thì chưa tính; cảnh báo cần để ý không tính", () => {
  const list = [...Array.from({ length: 5 }, () => alert(30, 1)), alert(3, null), { ...alert(40, 1), severity: "watch" as const }];
  assert.match(teacherResponse(list, NOW).basis, /5 cảnh báo/);
  assert.equal(teacherResponse(list.slice(0, 4), NOW).status, "chua-du");
});

test("5. cảnh báo cũ chưa ghi lúc nhận lần đầu thì ghi chú rõ là số ước tính", () => {
  const list = Array.from({ length: 5 }, (_, i) => ({ ...alert(48, 2), estimated: i < 2 }));
  assert.match(teacherResponse(list, NOW).extra ?? "", /2 cảnh báo.*ước tính/);
  assert.equal(teacherResponse(list.map((a) => ({ ...a, estimated: false })), NOW).extra, undefined);
});

test("6. còn dùng sau 1 tuần: 3/5 bạn quay lại trong ngày 8–14 = 60% ≥ 50% thì Đạt; bạn mới dùng chưa đủ 14 ngày không tính", () => {
  const today = "2026-11-20";
  const days = new Map<string, string[]>([
    ["a", ["2026-11-01", "2026-11-08"]], // ngày 8 → quay lại
    ["b", ["2026-11-01", "2026-11-14"]], // ngày 14 → quay lại
    ["c", ["2026-11-01", "2026-11-15"]], // ngày 15 → quá tuần thứ hai, không tính là quay lại
    ["d", ["2026-11-02", "2026-11-03"]], // chỉ trong tuần đầu
    ["e", ["2026-11-05", "2026-11-12"]], // ngày 8 → quay lại
    ["f", ["2026-11-10", "2026-11-18"]], // mới bắt đầu 10/11, chưa đủ 14 ngày → không tính
  ]);
  const m = retentionWeek1(days, today, 2);
  assert.equal(m.status, "dat");
  assert.match(m.value, /3\/5.*60%/);
});

test("6. giai đoạn 1: đủ 4 bạn là kết luận (3/4 = 75% ≥ 40% thì Đạt); giai đoạn 2 vẫn cần 5 bạn", () => {
  const today = "2026-11-20";
  const days = new Map<string, string[]>([
    ["a", ["2026-11-01", "2026-11-08"]], // quay lại
    ["b", ["2026-11-01", "2026-11-14"]], // quay lại
    ["c", ["2026-11-02", "2026-11-03"]], // chỉ tuần đầu
    ["e", ["2026-11-05", "2026-11-12"]], // quay lại
  ]);
  const m1 = retentionWeek1(days, today, 1);
  assert.equal(m1.status, "dat");
  assert.match(m1.value, /3\/4.*75%/);
  assert.match(m1.target, /40%.*từ 4 bạn/);
  assert.match(m1.finalTarget ?? "", /50%/);
  assert.equal(retentionWeek1(days, today, 2).status, "chua-du");
  assert.equal(retentionWeek1(new Map([...days].slice(0, 3)), today, 1).status, "chua-du"); // 3 bạn vẫn chưa đủ
});

test("7. chuyện bận lòng nhẹ đi: 3/6 chuyện được hỏi lại có mức lo giảm = 50% thì Đạt; dưới 5 bạn thì chưa đủ", () => {
  const w = [
    { userId: "a", levelStart: 4, lastLevel: 2 },
    { userId: "b", levelStart: 3, lastLevel: 2 },
    { userId: "c", levelStart: 5, lastLevel: 4 },
    { userId: "d", levelStart: 3, lastLevel: 3 },
    { userId: "e", levelStart: 2, lastLevel: 4 },
    { userId: "e", levelStart: 3, lastLevel: 3 },
    { userId: "f", levelStart: 4, lastLevel: null }, // chưa được hỏi lại → không tính
  ];
  const m = worriesLighter(w);
  assert.equal(m.status, "dat");
  assert.match(m.value, /3\/6.*50%/);
  assert.equal(worriesLighter(w.filter((x) => ["a", "b", "c", "d"].includes(x.userId))).status, "chua-du");
});

const pair = (group: "app" | "control", preW: number, postW: number, preP = 8, postP = 8, preH = 3, postH = 3): SurveyPair => ({
  group,
  className: group === "app" ? "7A1" : "7A2",
  pre: { who5: preW, pss4: preP, helpTeacher: preH },
  post: { who5: postW, pss4: postP, helpTeacher: postH },
  after: {},
});

test("8. WHO-5: lớp dùng app tăng 8 điểm, lớp không dùng tăng 1 → chênh +7 ≥ 5 thì Đạt", () => {
  const pairs = [
    ...[40, 44, 48, 52, 56].map((w) => pair("app", w, w + 8)),
    ...[40, 44, 48, 52, 56].map((w) => pair("control", w, w + 1)),
  ];
  const m = surveyMetric("who5", pairs);
  assert.equal(m.status, "dat");
  assert.equal(m.compare?.app.before, 48);
  assert.equal(m.compare?.app.after, 56);
  assert.equal(m.compare?.diff, 7);
});

test("9. PSS-4: thấp hơn là tốt; lớp dùng app giảm 2, lớp không dùng giảm 0.4 → chênh −1.6 ≤ −1 thì Đạt", () => {
  const pairs = [
    ...Array.from({ length: 5 }, () => pair("app", 50, 50, 9, 7)),
    ...[0, 0, 0, 1, 1].map((d) => pair("control", 50, 50, 9, 9 - d)),
  ];
  const m = surveyMetric("pss4", pairs);
  assert.equal(m.compare?.diff, -1.6);
  assert.equal(m.status, "dat");
});

test("C3. tìm đến thầy cô: chênh +0.3 — giai đoạn 2 (cần 0.5) thì Chưa đạt, giai đoạn 1 (cần 0.25) thì Đạt", () => {
  const pairs = [
    ...Array.from({ length: 5 }, () => pair("app", 50, 50, 8, 8, 3, 3.5)),
    ...Array.from({ length: 5 }, () => pair("control", 50, 50, 8, 8, 3, 3.2)),
  ];
  const m2 = surveyMetric("helpTeacher", pairs, 2);
  assert.equal(m2.compare?.diff, 0.3);
  assert.equal(m2.status, "chua-dat");
  const m1 = surveyMetric("helpTeacher", pairs, 1);
  assert.equal(m1.status, "dat");
  assert.match(m1.target, /0,25/);
  assert.match(m1.finalTarget ?? "", /0,5/);
});

test("B2. luyện bài: 3/10 bạn đã dùng app hoàn thành = 30% ≥ 30% thì Đạt ở giai đoạn 1; giai đoạn 2 cần 60%; dưới 5 bạn thì chưa đủ", () => {
  assert.equal(practiceDone({ used: 10, completed: 3 }, 1).status, "dat");
  assert.equal(practiceDone({ used: 10, completed: 2 }, 1).status, "chua-dat");
  assert.equal(practiceDone({ used: 10, completed: 3 }, 2).status, "chua-dat");
  assert.equal(practiceDone({ used: 4, completed: 4 }, 1).status, "chua-du");
});

test("B3. sửa bài sau góp ý: 4/10 = 40% ≥ 40% thì Đạt ở giai đoạn 1; giai đoạn 2 cần 50%; dưới 10 bài thì chưa đủ", () => {
  assert.equal(practiceRevised({ first: 10, revised: 4 }, 1).status, "dat");
  assert.equal(practiceRevised({ first: 10, revised: 3 }, 1).status, "chua-dat");
  assert.equal(practiceRevised({ first: 10, revised: 4 }, 2).status, "chua-dat");
  assert.equal(practiceRevised({ first: 9, revised: 9 }, 1).status, "chua-du");
});

const HELP_NOW = Date.parse("2026-11-13T12:00:00Z");
const help = (agoH: number, seenAfterH: number | null, repliedAfterH: number | null = null) => ({
  created_at: new Date(HELP_NOW - agoH * H).toISOString(),
  seen_at: seenAfterH === null ? null : new Date(HELP_NOW - agoH * H + seenAfterH * H).toISOString(),
  replied_at: repliedAfterH === null ? null : new Date(HELP_NOW - agoH * H + repliedAfterH * H).toISOString(),
});

test("C2. yêu cầu Cần giúp: giai đoạn 1 chỉ lấy số nền (Tham khảo) khi có từ 5 yêu cầu; giai đoạn 2 cần 80% trong 24 giờ", () => {
  const list = [help(60, 2), help(60, 5), help(60, 30), help(60, null, 10), help(60, 40, 50)]; // 3/5 kịp (2, 5 giờ, trả lời 10 giờ)
  const m1 = helpResponse(list, HELP_NOW, 1);
  assert.equal(m1.status, "tham-khao");
  assert.match(m1.value, /3\/5.*60%/);
  assert.equal(helpResponse(list, HELP_NOW, 2).status, "chua-dat");
  assert.equal(helpResponse([help(60, 2), help(60, 3), help(60, 4), help(60, 5), help(60, 6)], HELP_NOW, 2).status, "dat");
});

test("C2. yêu cầu chưa đủ 24 giờ và chưa ai xem thì chưa tính; dưới 5 yêu cầu thì chưa đủ dữ liệu", () => {
  const list = [help(60, 2), help(60, 2), help(60, 2), help(60, 2), help(3, null)];
  assert.equal(helpResponse(list, HELP_NOW, 1).status, "chua-du");
  assert.match(helpResponse(list, HELP_NOW, 1).basis, /4 yêu cầu/);
});

test("A1, B1, B4: chưa đo ở giai đoạn này, vẫn ghi mục tiêu; B1 chưa đặt mục tiêu ở giai đoạn 1 và là +2,5 điểm ở giai đoạn 2", () => {
  for (const k of ["biet-cang-thang", "diem-ky-nang", "tu-danh-gia"] as const) assert.equal(notMeasured(k, 1).status, "chua-du");
  assert.match(notMeasured("diem-ky-nang", 1).target, /chưa đo/i);
  assert.match(notMeasured("diem-ky-nang", 1).finalTarget ?? "", /2,5 điểm/);
  assert.match(notMeasured("biet-cang-thang", 1).target, /0,25/);
  assert.match(notMeasured("biet-cang-thang", 1).finalTarget ?? "", /0,5/);
});

test("chỉ số tham khảo: hiện số nhưng không chấm Đạt hay Chưa đạt; vẫn giữ 'chưa đủ dữ liệu'", () => {
  const ok = asReference(worriesLighter([]));
  assert.equal(ok.status, "chua-du");
  const days = new Map<string, string[]>([["a", ["2026-11-01", "2026-11-08"]], ["b", ["2026-11-01"]], ["c", ["2026-11-01"]], ["d", ["2026-11-01"]]]);
  const ref = asReference(retentionWeek1(days, "2026-11-20", 1));
  assert.equal(ref.status, "tham-khao");
  assert.match(ref.value, /1\/4/);
});

test("mọi chỉ số của trang kết quả đều thuộc một nhóm A–D hoặc tham khảo", () => {
  const keys = ["biet-cang-thang", "doan-chu-de", "diem-ky-nang", "luyen-bai", "sua-bai", "tu-danh-gia", "thay-co-kip-thoi", "can-giup-kip", "tim-thay-co", "an-toan", "bao-nham", "cau-tra-loi", "con-dung", "nhe-long", "khoe-hon", "bot-cang-thang"];
  for (const k of keys) assert.ok(METRIC_GROUP[k], k);
  assert.equal(new Set(keys.map((k) => METRIC_GROUP[k].code)).size, keys.length);
  assert.deepEqual(GROUPS.map((g) => g.id), ["A", "B", "C", "D", "ref"]);
});

test("8–10. một nhóm dưới 5 bạn có đủ hai phiếu thì chưa đủ dữ liệu, và vẫn ghi rõ số bạn", () => {
  const pairs = [...Array.from({ length: 6 }, () => pair("app", 40, 60)), ...Array.from({ length: 4 }, () => pair("control", 40, 41))];
  const m = surveyMetric("who5", pairs);
  assert.equal(m.status, "chua-du");
  assert.match(m.basis, /6 bạn.*4 bạn/);
  assert.equal(m.compare?.control.n, 4);
});
