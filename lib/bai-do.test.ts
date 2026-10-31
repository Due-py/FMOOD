// Bài đo trong app: giao đề, dựng phiếu từ bộ đo, câu hỏi có điều kiện. Chạy: npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { assignedForm, stableHash, TEST_IDS, TEST_TEXT_QUESTIONS, testDuration } from "./bai-do";
import { buildTestQuestions, parseTestForm } from "./bai-do-kit";
import { alertForViewer, TEST_ALERT_PREFIX } from "./staff-privacy";
import { isQuestionShown, questionSchema, validateAnswers } from "./surveys";

const KIT = path.join(process.cwd(), "ho-so-du-thi/3-kiem-thu/bo-do-ky-nang");
const read = (f: string) => readFileSync(path.join(KIT, f), "utf8");

test("số băm ổn định (FNV-1a): đúng giá trị chuẩn, cùng mã luôn ra cùng số", () => {
  assert.equal(stableHash(""), 0x811c9dc5);
  assert.equal(stableHash("a"), 0xe40c292c);
  assert.equal(stableHash("abc-123"), stableHash("abc-123"));
});

test("giao đề: số băm chẵn làm đề A ở lần 1, lần 2 tự đổi đề", () => {
  // "a" có số băm chẵn, "" có số băm lẻ (tính ở test trên)
  assert.equal(assignedForm("a", 1), "A");
  assert.equal(assignedForm("a", 2), "B");
  assert.equal(assignedForm("", 1), "B");
  assert.equal(assignedForm("", 2), "A");
});

test("giao đề: mọi tài khoản đổi đề giữa hai lần; khoảng một nửa làm đề A ở lần 1", () => {
  let a = 0;
  for (let i = 0; i < 1000; i++) {
    const id = `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
    assert.notEqual(assignedForm(id, 1), assignedForm(id, 2));
    if (assignedForm(id, 1) === "A") a++;
  }
  assert.ok(a > 400 && a < 600, `đề A: ${a}/1000`);
});

test("đề A và đề B: 4 tình huống, đủ 9 câu tự trả lời, đúng mã câu", () => {
  for (const f of ["1-bai-tinh-huong-de-A.md", "1-bai-tinh-huong-de-B.md"]) {
    const { situations, intro } = parseTestForm(read(f));
    assert.equal(situations.length, 4, f);
    assert.deepEqual(
      situations.flatMap((s) => s.questions.map((q) => q.id)),
      TEST_TEXT_QUESTIONS.map((q) => q.id),
      f,
    );
    assert.ok(situations.every((s) => s.context.length > 0), f);
    // câu cũ "không ai biết bài nào của em" không còn đúng khi làm bài trong app
    assert.ok(!intro.includes("không ai biết"), f);
    assert.ok(intro.includes("không thấy tên em"), f);
  }
});

test("phiếu bài đo: lần 1 có 16 câu, lần 2 thêm câu đã đọc đề ở đầu; câu nào cũng hợp lệ", () => {
  const extra = read("3-cau-hoi-them-vao-phieu.md");
  const r1 = buildTestQuestions(read("1-bai-tinh-huong-de-A.md"), extra, 1);
  const r2 = buildTestQuestions(read("1-bai-tinh-huong-de-B.md"), extra, 2);
  assert.equal(r1.length, 16);
  assert.equal(r2.length, 17);
  assert.equal(r2[0].id, TEST_IDS.readBefore);
  assert.deepEqual(r1.map((q) => q.id).slice(9), ["TD1", "TD2", "TD3", "TD4", "HV1", "HV2", "AI"]);
  assert.equal(r1[r1.length - 1].text, "Khi làm bài, em có dùng AI hoặc nhờ ai không?");
  for (const q of [...r1, ...r2]) assert.ok(questionSchema.safeParse(q).success, q.id);
  // phiếu cho học sinh bỏ phần ghi kỹ năng trong ngoặc
  assert.ok(r1.filter((q) => q.id.startsWith("TD")).every((q) => !/K\d|kỹ năng/u.test(q.text)));
  // câu đầu mỗi tình huống kèm đoạn tả tình huống
  assert.ok(r1[0].text.startsWith("Tình huống 1\n") && r1[0].text.includes("5 điểm"));
  assert.ok(r2[1].text.includes("phát âm"));
});

test("HV2 chỉ hỏi khi HV1 từ 1 lần trở lên; câu không được hỏi thì không bắt buộc trả lời", () => {
  const qs = buildTestQuestions(read("1-bai-tinh-huong-de-A.md"), read("3-cau-hoi-them-vao-phieu.md"), 1);
  const hv2 = qs.find((q) => q.id === "HV2")!;
  assert.equal(isQuestionShown(hv2, { HV1: "Chưa lần nào" }), false);
  assert.equal(isQuestionShown(hv2, { HV1: "1 lần" }), true);
  assert.equal(isQuestionShown(hv2, { HV1: "Từ 4 lần trở lên" }), true);
  assert.equal(isQuestionShown(hv2, { HV1: "Trong 2 tuần qua em không có bài nào chưa hiểu" }), false);
  assert.equal(isQuestionShown(hv2, {}), false);
  const required = { ...hv2, required: true };
  assert.equal(validateAnswers([required], { HV1: "Chưa lần nào" }), null);
  assert.ok(validateAnswers([required], { HV1: "1 lần" }));
});

test("giới hạn chữ: phiếu thường 1000 ký tự như cũ, bài đo 1500", () => {
  const q = { id: "1a", type: "text" as const, text: "1a. ?", required: false, options: [], minLabel: "", maxLabel: "" };
  assert.ok(validateAnswers([q], { "1a": "x".repeat(1200) }));
  assert.equal(validateAnswers([q], { "1a": "x".repeat(1200) }, "test"), null);
  assert.ok(validateAnswers([q], { "1a": "x".repeat(1600) }, "test"));
});

test("thời gian làm bài: tính bằng giây; mốc bắt đầu sai hoặc quá xa thì bỏ trống", () => {
  const now = new Date("2026-11-03T19:20:00+07:00");
  assert.equal(testDuration("2026-11-03T19:05:00+07:00", now), 900);
  assert.equal(testDuration("2026-11-03T19:30:00+07:00", now), null);
  assert.equal(testDuration("2026-11-02T19:05:00+07:00", now), null);
  assert.equal(testDuration("không phải ngày", now), null);
  assert.equal(testDuration(null, now), null);
});

test("cảnh báo từ bài đo: chỉ phòng tham vấn đọc đoạn trích; admin và giáo viên không đọc", () => {
  const alert = { excerpt: `${TEST_ALERT_PREFIX} · 1a. ?\nTrả lời: …`, reasons: ["x"], note: "ghi chú" };
  assert.equal(alertForViewer(alert, "counselor").excerpt, alert.excerpt);
  const admin = alertForViewer(alert, "admin");
  assert.equal(admin.excerpt, null);
  assert.deepEqual(admin.reasons, []);
  assert.equal(admin.contentHidden, true);
  assert.equal(alertForViewer(alert, "teacher").excerpt, null);
  // phiếu khảo sát thường: admin vẫn đọc như trước
  assert.equal(alertForViewer({ ...alert, excerpt: "Phiếu “A” · câu\nTrả lời: …" }, "admin").contentHidden, false);
});
