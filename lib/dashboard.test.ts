// Tổng quan app: số liệu 7 khu trên dữ liệu mẫu, so với số tính tay. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { firstMessageSource, sourceFromParams } from "./chat-source";
import { computeDashboard, dashboardCsv, resolveRange, selCaselCounts, selStepCounts, vnHour, vnWeekday, type DashRows } from "./dashboard-calc";

const TODAY = "2026-11-12";
const RANGE = { from: "2026-11-03", to: "2026-11-12" };
const LABELS = { topics: { "hoc-tap": "Học tập", "ban-be": "Bạn bè" }, actions: { "action.chung.hit-tho-hop": "HD07 · Hít thở hộp" }, lessons: {} };

/** giờ Việt Nam → ISO */
const at = (day: string, hour = 9) => new Date(`${day}T${String(hour).padStart(2, "0")}:00:00+07:00`).toISOString();
const S = ["s1", "s2", "s3", "s4", "s5", "s6"];
/** học sinh lớp thử: bên đọc dữ liệu đã bỏ khỏi `students`, mọi dòng của bạn này phải bị bỏ qua */
const TEST_STUDENT = "lop-thu";

function empty(): DashRows {
  return {
    students: S.map((id) => ({ id, classId: "c1" })),
    checkins: [],
    conversations: [],
    messages: [],
    feedback: [],
    activity: [],
    opens: [],
    alerts: [],
    helpRequests: [],
    helpButtons: [],
    worries: [],
    worryChecks: [],
    habitLogs: [],
    gardenHarvests: [],
    practice: null,
    testScores: null,
  };
}

test("khoảng thời gian: 7 ngày, 30 ngày, đợt thử, tự chọn; sai thì về 7 ngày", () => {
  assert.deepEqual(resolveRange({}, TODAY), { from: "2026-11-06", to: TODAY, preset: "7" });
  assert.deepEqual(resolveRange({ khoang: "30" }, TODAY), { from: "2026-10-14", to: TODAY, preset: "30" });
  assert.deepEqual(resolveRange({ khoang: "dot-thu" }, "2026-12-01"), { from: "2026-11-03", to: "2026-11-12", preset: "dot-thu" });
  assert.deepEqual(resolveRange({ khoang: "tu-chon", tu: "2026-11-01", den: "2026-11-05" }, TODAY), { from: "2026-11-01", to: "2026-11-05", preset: "tu-chon" });
  assert.equal(resolveRange({ khoang: "tu-chon", tu: "2026-11-09", den: "2026-11-05" }, TODAY).preset, "7");
  assert.equal(resolveRange({ khoang: "tu-chon", tu: "abc" }, TODAY).preset, "7");
});

test("giờ và thứ theo giờ Việt Nam", () => {
  assert.equal(vnHour(at("2026-11-09", 23)), 23);
  assert.equal(vnWeekday(at("2026-11-09")), 0); // 09/11/2026 là thứ Hai
  assert.equal(vnWeekday(at("2026-11-15")), 6); // Chủ nhật
});

test("khu 1 và 2: số hoạt động, lượt ghi tâm trạng theo ngày; ngày dưới 5 bạn bị ẩn; bỏ học sinh lớp thử", () => {
  const rows = empty();
  // 03/11: 5 bạn ghi tâm trạng (2 vui, 1 bình thường, 1 buồn, 1 chưa rõ)
  rows.checkins.push(
    { userId: "s1", at: at("2026-11-03"), emotions: ["vui"] },
    { userId: "s2", at: at("2026-11-03"), emotions: ["vui", "binh-yen"] },
    { userId: "s3", at: at("2026-11-03"), emotions: ["binh-thuong"] },
    { userId: "s4", at: at("2026-11-03"), emotions: ["buon", "vui"] },
    { userId: "s5", at: at("2026-11-03"), emotions: ["chua-ro"] },
    // 04/11: chỉ 4 bạn → ẩn tỉ lệ tâm trạng ngày đó
    { userId: "s1", at: at("2026-11-04"), emotions: ["vui"] },
    { userId: "s2", at: at("2026-11-04"), emotions: ["vui"] },
    { userId: "s3", at: at("2026-11-04"), emotions: ["vui"] },
    { userId: "s4", at: at("2026-11-04"), emotions: ["vui"] },
    // lớp thử: không được tính
    { userId: TEST_STUDENT, at: at("2026-11-03"), emotions: ["buon"] },
    // ngoài khoảng chọn
    { userId: "s6", at: at("2026-10-20"), emotions: ["buon"] },
  );
  rows.activity.push({ userId: "s6", at: at("2026-11-12"), kind: "tiny_action_done", ref: "action.chung.hit-tho-hop" });
  rows.helpRequests.push({ userId: "s6", at: at("2026-11-12") });
  rows.alerts.push({ at: at("2026-11-05"), severity: "urgent" });

  const d = computeDashboard(rows, RANGE, TODAY, LABELS);
  assert.equal(d.students, 6);
  assert.equal(d.tooSmall, false);
  assert.equal(d.usage.totals.checkins, 9); // 5 + 4, không tính lớp thử và ngoài khoảng
  assert.equal(d.usage.totals.actionsDone, 1);
  assert.equal(d.usage.totals.help, 1);
  assert.equal(d.usage.totals.alerts, 1);
  assert.equal(d.usage.activeRange, 6); // s1–s5 ghi tâm trạng, s6 làm việc nhỏ
  assert.equal(d.usage.activeToday, null); // hôm nay chỉ s6: 1 bạn → ẩn
  assert.equal(d.usage.daily.length, 10);
  assert.equal(d.usage.daily[0].active, 5);
  assert.equal(d.usage.daily[1].active, null); // 4 bạn → ẩn
  assert.equal(d.usage.daily[2].active, 0); // 0 vẫn hiện là 0

  assert.deepEqual(d.mood.daily[0].counts, { positive: 2, neutral: 1, negative: 1, unsure: 1, total: 5 });
  assert.equal(d.mood.daily[1].counts, null);
  assert.deepEqual(d.mood.total, { positive: 6, neutral: 1, negative: 1, unsure: 1, total: 9 });
});

test("khu 3: trung bình tin mỗi cuộc, nguồn, chủ đề dưới 5 bạn bị gộp, 👍/👎", () => {
  const rows = empty();
  rows.conversations.push(
    { id: "c1", userId: "s1", at: at("2026-11-05"), source: "checkin" },
    { id: "c2", userId: "s2", at: at("2026-11-05"), source: "starter" },
    { id: "c3", userId: "s3", at: at("2026-11-06"), source: null },
    { id: "cx", userId: TEST_STUDENT, at: at("2026-11-06"), source: "home" },
  );
  for (let i = 0; i < 4; i++) rows.messages.push({ userId: "s1", conversationId: "c1", at: at("2026-11-05", 10) });
  rows.messages.push({ userId: "s2", conversationId: "c2", at: at("2026-11-05", 10) }, { userId: "s3", conversationId: "c3", at: at("2026-11-06") });
  rows.messages.push({ userId: TEST_STUDENT, conversationId: "cx", at: at("2026-11-06") });
  for (const u of S.slice(0, 5)) rows.activity.push({ userId: u, at: at("2026-11-07"), kind: "topic_guess_yes", ref: "hoc-tap" });
  rows.worries.push({ userId: "s6", at: at("2026-11-07"), topic: "ban-be" });
  rows.feedback.push({ userId: "s1", at: at("2026-11-05"), rating: 1 }, { userId: "s2", at: at("2026-11-05"), rating: -1 }, { userId: "s3", at: at("2026-11-05"), rating: 1 });

  const d = computeDashboard(rows, RANGE, TODAY, LABELS);
  assert.equal(d.chat.conversations, 3);
  assert.equal(d.chat.messages, 6);
  assert.equal(d.chat.avgPerConversation, 2); // 6 tin / 3 cuộc
  assert.deepEqual(
    d.chat.sources.map((s) => [s.key, s.count]).sort(),
    [
      ["checkin", 1],
      ["starter", 1],
      ["unknown", 1],
    ],
  );
  assert.deepEqual(d.chat.topics, [{ key: "hoc-tap", label: "Học tập", count: 5, students: 5 }]);
  assert.equal(d.chat.hiddenTopics, 1); // "Bạn bè" chỉ 1 bạn
  assert.deepEqual(d.chat.feedback, { ups: 2, downs: 1 });
});

test("khu 4: chưa có bảng bài luyện thì báo chưa có dữ liệu; có thì đếm theo K1–K4 và tỉ lệ", () => {
  const rows = empty();
  assert.equal(computeDashboard(rows, RANGE, TODAY, LABELS).practice.ready, false);

  rows.practice = [
    ...S.slice(0, 5).map((u) => ({ userId: u, at: at("2026-11-05"), skill: "K3", status: "completed" })),
    { userId: "s6", at: at("2026-11-05"), skill: "k3", status: "paused" },
    { userId: "s1", at: at("2026-11-06"), skill: "K1", status: "in_progress" },
  ];
  rows.activity.push(
    { userId: "s1", at: at("2026-11-05"), kind: "practice_feedback", ref: "K3" },
    { userId: "s2", at: at("2026-11-05"), kind: "practice_revised", ref: "K3" },
  );
  rows.opens.push(
    { userId: "s1", at: at("2026-11-05"), kind: "tiny_action", ref: "action.chung.hit-tho-hop" },
    { userId: "s2", at: at("2026-11-05"), kind: "tiny_action", ref: "action.chung.hit-tho-hop" },
    { userId: "s2", at: at("2026-11-05"), kind: "lesson", ref: "goi-ten-cam-xuc" },
  );
  rows.activity.push({ userId: "s1", at: at("2026-11-05"), kind: "tiny_action_done", ref: "action.chung.hit-tho-hop" });

  const d = computeDashboard(rows, RANGE, TODAY, LABELS);
  const k3 = d.practice.bySkill.find((s) => s.skill === "K3");
  assert.deepEqual(k3 && { sessions: k3.sessions, students: k3.students, completed: k3.completed }, { sessions: 6, students: 6, completed: 5 });
  const k1 = d.practice.bySkill.find((s) => s.skill === "K1");
  assert.equal(k1?.students, null); // 1 bạn → ẩn
  assert.equal(d.practice.rates.completed, 5 / 7);
  assert.equal(d.practice.rates.feedback, 1 / 7);
  assert.deepEqual(d.practice.topActions, [{ key: "action.chung.hit-tho-hop", label: "HD07 · Hít thở hộp", opens: 2, done: 1 }]);
  assert.deepEqual(d.practice.topLessons, [{ key: "goi-ten-cam-xuc", label: "goi-ten-cam-xuc", opens: 1 }]);
  assert.equal(d.usage.totals.practiceDone, 5);
});

test("khu 5: hỏi thăm lại ẩn khi 4 bạn; tuần đầu so với tuần gần nhất chỉ tính bạn dùng từ 2 tuần", () => {
  const rows = empty();
  rows.worryChecks.push(
    { userId: "s1", at: at("2026-11-05"), feeling: "better" },
    { userId: "s2", at: at("2026-11-05"), feeling: "same" },
    { userId: "s3", at: at("2026-11-05"), feeling: "worse" },
    { userId: "s4", at: at("2026-11-05"), feeling: "better" },
  );
  assert.equal(computeDashboard(rows, RANGE, TODAY, LABELS).outcomes.followups, null);
  rows.worryChecks.push({ userId: "s5", at: at("2026-11-06"), feeling: "done" });
  assert.deepEqual(computeDashboard(rows, RANGE, TODAY, LABELS).outcomes.followups, { better: 2, same: 1, worse: 1, done: 1, students: 5 });

  // 5 bạn dùng từ 20/10 tới 10/11: tuần đầu buồn (−1), tuần gần nhất vui (+1); s6 chỉ dùng 3 ngày → không tính
  for (const u of S.slice(0, 5)) {
    rows.checkins.push({ userId: u, at: at("2026-10-20"), emotions: ["buon"] }, { userId: u, at: at("2026-11-10"), emotions: ["vui"] });
  }
  rows.checkins.push({ userId: "s6", at: at("2026-11-08"), emotions: ["buon"] }, { userId: "s6", at: at("2026-11-10"), emotions: ["vui"] });
  const fl = computeDashboard(rows, RANGE, TODAY, LABELS).outcomes.firstVsLatest;
  assert.deepEqual(fl, { students: 5, first: -1, latest: 1, improved: 5, same: 0, worse: 0 });

  // bài đo: chưa có bảng → null; có điểm 2 lần của 5 bạn → trung bình trước – sau
  assert.equal(computeDashboard(rows, RANGE, TODAY, LABELS).outcomes.testsReady, false);
  rows.testScores = S.slice(0, 5).flatMap((u, i) => [
    { userId: u, round: 1, total: 4 + i },
    { userId: u, round: 2, total: 6 + i },
  ]);
  assert.deepEqual(computeDashboard(rows, RANGE, TODAY, LABELS).outcomes.tests, { students: 5, before: 6, after: 8 });
});

test("khu 6 và 7: tỉ lệ quay lại theo tính năng, bản đồ nhiệt, giữ chân 7 / 14 ngày", () => {
  const rows = empty();
  // 5 bạn ghi tâm trạng 03/11 lúc 20h (thứ Ba); 3 bạn quay lại 11/11
  for (const u of S.slice(0, 5)) rows.checkins.push({ userId: u, at: at("2026-11-03", 20), emotions: ["vui"] });
  for (const u of S.slice(0, 3)) rows.checkins.push({ userId: u, at: at("2026-11-11", 20), emotions: ["vui"] });
  rows.habitLogs.push({ userId: "s1", day: "2026-11-04" });

  const d = computeDashboard(rows, RANGE, TODAY, LABELS);
  const checkin = d.engagement.features.find((f) => f.key === "checkin");
  assert.deepEqual(checkin && { students: checkin.students, uses: checkin.uses, returnRate: checkin.returnRate }, { students: 5, uses: 8, returnRate: 3 / 5 });
  const habits = d.engagement.features.find((f) => f.key === "habits");
  assert.equal(habits?.students, null); // 1 bạn → ẩn
  assert.equal(habits?.returnRate, null);
  assert.equal(d.engagement.heatmap[1][20], 5); // thứ Ba 20h
  assert.equal(d.engagement.heatmap[2][20], 3); // thứ Tư 20h
  assert.equal(d.engagement.heatmapMax, 5);
  assert.deepEqual(d.retention.d7, { cohort: 5, retained: 3 });
  assert.equal(d.retention.d14, null); // 03/11 + 14 ngày chưa tới 12/11
});

test("nhóm dưới 5 bạn: ẩn mọi số người; CSV không có nội dung, chỉ số gộp", () => {
  const rows = empty();
  rows.students = rows.students.slice(0, 4);
  for (const u of ["s1", "s2", "s3", "s4"]) rows.checkins.push({ userId: u, at: at("2026-11-05"), emotions: ["buon"] });
  const d = computeDashboard(rows, RANGE, TODAY, LABELS);
  assert.equal(d.tooSmall, true);
  assert.equal(d.usage.activeRange, null);
  assert.equal(d.mood.total, null);
  const csv = dashboardCsv(d, "8A1");
  assert.ok(csv.length > 20);
  assert.ok(csv.every((r) => r.length === 3));
});

test("nguồn cuộc trò chuyện theo lối vào", () => {
  assert.equal(sourceFromParams({ chuyen: "abc" }), "worry");
  assert.equal(sourceFromParams({ tu: "tam-trang" }), "checkin");
  assert.equal(sourceFromParams({ tu: "trang-chu" }), "home");
  assert.equal(sourceFromParams({ tu: "luyen" }), "practice");
  assert.equal(sourceFromParams({ tu: "la" }), "other");
  assert.equal(firstMessageSource("home", true), "starter");
  assert.equal(firstMessageSource("other", true), "starter");
  assert.equal(firstMessageSource("checkin", true), "checkin");
  assert.equal(firstMessageSource("home", false), "home");
});

test("khu 3: nhân vật và tùy chọn (chưa chọn tính theo mặc định, dưới 5 bạn ẩn), thẻ gợi ý đã hiện / đã bấm", () => {
  const rows = empty();
  assert.equal(computeDashboard(rows, RANGE, TODAY, LABELS).chat.styles, null, "chưa chạy 0020");
  rows.styleDefault = { character: "soc", length: "vua", guidance: "thang", motivation: "tu_lo" };
  rows.chatStyles = [
    { userId: "s1", style: { character: "cu", length: "ngan", guidance: "thang", motivation: "tu_lo" } },
    { userId: "s2", style: null },
    { userId: "s3", style: { character: "rong" } },
    { userId: TEST_STUDENT, style: { character: "kien" } },
  ];
  rows.activity.push(
    { userId: "s1", at: at("2026-11-04"), kind: "style_changed", ref: "cu|ngan|thang|tu_lo" },
    { userId: "s1", at: at("2026-11-04"), kind: "card_shown", ref: "goal" },
    { userId: "s2", at: at("2026-11-05"), kind: "card_shown", ref: "goal" },
    { userId: "s2", at: at("2026-11-05"), kind: "card_clicked", ref: "goal:add" },
    { userId: "s3", at: at("2026-11-05"), kind: "card_shown", ref: "skill:K3" },
    { userId: "s3", at: at("2026-11-05"), kind: "card_clicked", ref: "skill:K3" },
    { userId: "s4", at: at("2026-11-06"), kind: "card_shown", ref: "end" },
    { userId: "s4", at: at("2026-11-06"), kind: "card_clicked", ref: "end:continue" },
    { userId: "s4", at: at("2026-10-01"), kind: "card_shown", ref: "end" }, // ngoài khoảng
    { userId: TEST_STUDENT, at: at("2026-11-06"), kind: "card_shown", ref: "goal" },
  );
  const d = computeDashboard(rows, RANGE, TODAY, LABELS);
  const styles = d.chat.styles!;
  assert.equal(styles.chosen, null, "2 bạn tự chọn: ẩn");
  assert.equal(styles.changes, 1);
  const chars = styles.groups.find((g) => g.group === "character")!.items;
  // 6 bạn: s1 chọn Cú, s3 giá trị lạ → mặc định Sóc, còn lại chưa chọn → Sóc
  assert.deepEqual(chars.map((c) => [c.key, c.students, c.isDefault]), [["soc", 5, true], ["cu", null, false], ["kien", 0, false]]);
  assert.deepEqual(d.chat.cards.goal, { shown: 2, add: 1, later: 0 });
  assert.deepEqual(d.chat.cards.skill, { shown: 1, opened: 1, bySkill: [{ skill: "K3", shown: 1, opened: 1 }] });
  assert.deepEqual(d.chat.cards.end, { shown: 1, stop: 0, cont: 1 });
  assert.ok(dashboardCsv(d, "8A1").some((r) => r[0] === "3. Thẻ gợi ý"));
});

test("bước SEL: đếm số cuộc trò chuyện đạt mỗi bước (mỗi cuộc tính một lần), chưa có dữ liệu thì null", () => {
  const rows = [
    { userId: "a", at: "2026-11-04T10:00:00Z", moves: ["lam-ro-cam-xuc", "lam-ro-cam-xuc", "hoi-suy-nghi"] },
    { userId: "b", at: "2026-11-04T11:00:00Z", moves: ["lam-ro-cam-xuc", "dua-lua-chon"] },
    { userId: "c", at: "2026-10-01T11:00:00Z", moves: ["chot-buoc-nho"] },
  ];
  const inRange = (at: string) => at >= "2026-11-01";
  assert.deepEqual(
    selStepCounts(rows, inRange)?.map((s) => [s.key, s.count]),
    [["dua-lua-chon", 1], ["lam-ro-cam-xuc", 2], ["hoi-suy-nghi", 1]],
  );
  assert.equal(selStepCounts(null, inRange), null);
  assert.equal(selStepCounts([], inRange), null);
  assert.equal(selStepCounts(rows, inRange)?.find((s) => s.key === "lam-ro-cam-xuc")?.note, "· K1 · Tự nhận thức");
});

test("năng lực CASEL: mỗi cuộc trò chuyện tính một lần cho mỗi năng lực đã chạm; đủ năm năng lực kể cả 0", () => {
  const rows = [
    { userId: "a", at: "2026-11-04T10:00:00Z", moves: ["moi-vao", "lam-ro-cam-xuc", "hoi-co-the"] },
    { userId: "b", at: "2026-11-04T11:00:00Z", moves: ["lam-ro-cam-xuc", "dua-lua-chon"] },
    { userId: "c", at: "2026-10-01T11:00:00Z", moves: ["loi-nho"] },
  ];
  const got = selCaselCounts(rows, (at) => at >= "2026-11-01");
  assert.deepEqual(got?.map((c) => [c.key, c.count]), [
    ["tu-nhan-thuc", 2],
    ["tu-quan-ly", 1],
    ["nhan-thuc-xa-hoi", 0],
    ["ky-nang-quan-he", 0],
    ["ra-quyet-dinh", 1],
  ]);
  assert.equal(selCaselCounts([{ userId: "a", at: "2026-11-04T10:00:00Z", moves: ["mo", "moi-vao"] }], () => true), null);
});
