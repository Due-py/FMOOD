// Độ bền bài luyện (P0 "Bốn mô-đun và điều phối"): khôi phục phiên sau khi tải lại / tạm dừng, từ chối kể chuyện riêng
// (chọn tình huống mẫu vẫn luyện được), AI lỗi → tiêu chí cố định, chuyển trạng thái tới "Chuyển an toàn". Chạy: npm test
// (state.test.ts đã có 28 lần chuyển, AI không đổi trạng thái, tạm dừng / mở lại trong cùng một lần chạy)
import assert from "node:assert/strict";
import { test } from "node:test";
import { caseByCode, casesForSkill, PRACTICE_CASES, SKILL_CODES, SKILLS, type SkillCode } from "@/lib/skills";
import { acceptFeedback, criteriaFeedback } from "./output-check";
import { parseStart, situationFromRow, snapshotFromRows, START_ERRORS, type SessionCols } from "./rows";
import {
  AI_LIMITS,
  aiAllowed,
  emptySnapshot,
  PRACTICE_STATES,
  transition,
  type Actor,
  type AiUse,
  type Answers,
  type PracticeEvent,
  type Snapshot,
} from "./state";

const fullAnswers = (skill: SkillCode): Answers =>
  Object.fromEntries(SKILLS[skill].fields.filter((f) => f.required).map((f) => [f.key, `bài làm ô ${f.key}`]));

/** Giả lập lưu xuống cơ sở dữ liệu (đúng các cột saveSnapshot ghi, bài làm theo lần) rồi đọc lại như khi tải lại trang. */
type Stored = { session: SessionCols; attempts: { version: 1 | 2; answers: Answers }[] };
function save(s: Snapshot, prev: Stored | null): Stored {
  const attempts = [...(prev?.attempts ?? [])];
  if (s.versions > attempts.length) attempts.push({ version: s.versions as 1 | 2, answers: s.answers });
  return {
    session: { skill: s.skill, step: s.step, state: s.state, hint_count: s.hintCount, feedback_count: s.feedbackCount, stall_count: s.stallCount },
    // đi qua JSON như dữ liệu thật trả về từ máy chủ
    attempts: JSON.parse(JSON.stringify(attempts)),
  };
}
const reload = (st: Stored) => snapshotFromRows(st.session, st.attempts);

/** Mỗi bước: chuyển trạng thái, lưu, tải lại; trạng thái sau khi tải lại phải y như trước khi lưu. */
function runWithReload(skill: SkillCode, events: [PracticeEvent, Actor?][]): { s: Snapshot; stored: Stored } {
  let stored = save(emptySnapshot(skill), null);
  let s = reload(stored);
  for (const [event, actor = "student"] of events) {
    const t = transition(s, event, actor);
    assert.ok(t.ok, `${skill}: ${event.type} bị từ chối: ${t.ok ? "" : t.reason}`);
    stored = save(t.next, stored);
    s = reload(stored);
    assert.deepEqual(s, t.next, `${skill}: sau ${event.type}, tải lại không giữ đúng trạng thái`);
  }
  return { s, stored };
}

const toWriting: [PracticeEvent, Actor?][] = [[{ type: "start" }], [{ type: "next" }], [{ type: "next" }]];

test("khôi phục phiên: tải lại sau mỗi bước, cả 4 mô-đun đi hết tới Hoàn thành", () => {
  for (const skill of SKILL_CODES) {
    const { s } = runWithReload(skill, [
      ...toWriting,
      [{ type: "submit", answers: fullAnswers(skill) }],
      [{ type: "feedback" }],
      [{ type: "submit", answers: { ...fullAnswers(skill), [SKILLS[skill].fields[0].key]: "đã sửa lần 2" } }],
      [{ type: "next" }],
      [{ type: "confirm" }],
    ]);
    assert.equal(s.state, "completed", skill);
    assert.equal(s.versions, 2);
    // bài làm sau khi tải lại là lần mới nhất (lần 2)
    assert.equal(s.answers[SKILLS[skill].fields[0].key], "đã sửa lần 2");
  }
});

test("khôi phục phiên: tạm dừng, đóng trang, mở lại thì làm tiếp đúng bước, bài đã viết còn nguyên", () => {
  const skill: SkillCode = "K3";
  const { stored } = runWithReload(skill, [...toWriting, [{ type: "submit", answers: fullAnswers(skill) }], [{ type: "pause" }]]);
  const later = reload(JSON.parse(JSON.stringify(stored)));
  assert.equal(later.state, "paused");
  assert.deepEqual(later.answers, fullAnswers(skill));
  // đang tạm dừng: không gọi AI
  for (const use of Object.keys(AI_LIMITS) as AiUse[]) assert.equal(aiAllowed(use, {}, later.state), false, use);
  const resumed = transition(later, { type: "resume" }, "student");
  assert.ok(resumed.ok);
  assert.equal(resumed.next.state, "in_progress");
  assert.equal(resumed.next.step, "G");
  assert.equal(transition(resumed.next, { type: "feedback" }, "student").ok, true);
  // tạm dừng ngay ở bước Hiểu (chưa viết gì): mở lại là "Chưa bắt đầu"
  const early = runWithReload("K1", [[{ type: "pause" }]]).s;
  const back = transition(early, { type: "resume" }, "student");
  assert.ok(back.ok && back.next.state === "not_started");
});

test("khôi phục phiên: dữ liệu lần 2 lưu trước lần 1 (thứ tự trả về bất kỳ) vẫn lấy đúng bài mới nhất", () => {
  const session: SessionCols = { skill: "K2", step: "N", state: "in_progress", hint_count: 1, feedback_count: 1, stall_count: 0 };
  const s = snapshotFromRows(session, [
    { version: 2, answers: { goal: "lần 2" } },
    { version: 1, answers: { goal: "lần 1" } },
  ]);
  assert.equal(s.versions, 2);
  assert.equal(s.answers.goal, "lần 2");
  // bài cũ chưa có bài làm, hoặc bài làm rỗng
  assert.deepEqual(snapshotFromRows(session, []).answers, {});
  assert.deepEqual(snapshotFromRows(session, [{ version: 1, answers: null }]).answers, {});
});

test("từ chối kể chuyện riêng: chọn tình huống mẫu đúng kỹ năng thì luyện được, trợ lý chỉ thấy tình huống mẫu", () => {
  for (const skill of SKILL_CODES) {
    // không viết gì, không chọn gì: nhắc chọn tình huống mẫu
    assert.deepEqual(parseStart({ skill, ownSituation: "" }), { ok: false, error: START_ERRORS.nothing });
    assert.deepEqual(parseStart({ skill, ownSituation: "  ừ " }), { ok: false, error: START_ERRORS.nothing });
    for (const c of casesForSkill(skill)) {
      const started = parseStart({ skill, caseCode: c.code, ownSituation: "" });
      assert.deepEqual(started, { ok: true, skill, caseCode: c.code, ownSituation: null }, `${skill} ${c.code}`);
      const sit = situationFromRow({ case_code: c.code, own_situation: null });
      assert.deepEqual(sit, { text: c.situation, own: false });
    }
    // tình huống mẫu của kỹ năng khác: không nhận
    const other = PRACTICE_CASES.find((c) => !c.skills.includes(skill));
    if (other) assert.deepEqual(parseStart({ skill, caseCode: other.code }), { ok: false, error: START_ERRORS.wrongCase });
  }
  // cả bài đi hết bằng tình huống mẫu
  const { s } = runWithReload("K4", [...toWriting, [{ type: "submit", answers: fullAnswers("K4") }], [{ type: "next" }], [{ type: "confirm" }]]);
  assert.equal(s.state, "completed");
  assert.deepEqual(parseStart({ skill: "K9", caseCode: "TL01" }), { ok: false, error: START_ERRORS.skill });
});

test("kể chuyện riêng: lời tự kể được dùng (bỏ tình huống mẫu), khoảng trắng gọn lại, cắt độ dài", () => {
  const started = parseStart({ skill: "K3", caseCode: "TL09", ownSituation: "  Mai   nộp 3 bài  " });
  assert.deepEqual(started, { ok: true, skill: "K3", caseCode: null, ownSituation: "Mai nộp 3 bài" });
  const long = parseStart({ skill: "K1", ownSituation: "a ".repeat(400) });
  assert.ok(long.ok && long.ownSituation!.length === 300);
  assert.deepEqual(situationFromRow({ case_code: null, own_situation: "Mai nộp 3 bài" }), { text: "Mai nộp 3 bài", own: true });
  // mã tình huống không tồn tại trong dữ liệu cũ: không hiện gì, không lỗi
  assert.deepEqual(situationFromRow({ case_code: "TL99", own_situation: null }), { text: null, own: false });
  assert.equal(caseByCode("TL99"), null);
});

test("AI lỗi, quá giờ, trả sai dạng: góp ý là danh sách tiêu chí cố định của đúng mô-đun; bài vẫn đi tiếp được", () => {
  for (const skill of SKILL_CODES) {
    const fb = acceptFeedback(skill, null, "");
    assert.deepEqual(fb, criteriaFeedback(skill));
    assert.ok(fb.kind === "criteria" && fb.criteria.length >= 3, skill);
    // trả thiếu ý (chuỗi rỗng) cũng thay bằng tiêu chí
    assert.equal(acceptFeedback(skill, { good: "", fix: "", question: "" }, "").kind, "criteria");
    // góp ý (dù là tiêu chí cố định) vẫn tính là đã góp ý: sửa lần 2 và xác nhận xong được
    const { s } = runWithReload(skill, [
      ...toWriting,
      [{ type: "submit", answers: fullAnswers(skill) }],
      [{ type: "feedback" }],
      [{ type: "submit", answers: fullAnswers(skill) }],
      [{ type: "confirm" }],
    ]);
    assert.equal(s.state, "completed", skill);
  }
  // K3: tiêu chí cố định có yêu cầu hai phương án
  const k3 = criteriaFeedback("K3");
  assert.ok(k3.kind === "criteria" && k3.criteria.some((c) => /hai cách/.test(c)));
});

test("Chuyển an toàn: từ mọi trạng thái chưa xong, mọi bước; sau đó không đi tiếp, không gọi AI", () => {
  const paths: Record<string, [PracticeEvent, Actor?][]> = {
    "chưa bắt đầu": [],
    "Hiểu": [[{ type: "start" }]],
    "Mẫu": [[{ type: "start" }], [{ type: "next" }]],
    "Tự làm": toWriting,
    "cần gợi ý": [...toWriting, [{ type: "dont_know" }]],
    "bỏ qua ô": [...toWriting, [{ type: "skip" }]],
    "Góp ý": [...toWriting, [{ type: "submit", answers: fullAnswers("K1") }]],
    "Nhìn lại": [...toWriting, [{ type: "submit", answers: fullAnswers("K1") }], [{ type: "next" }]],
    "tạm dừng": [...toWriting, [{ type: "submit", answers: fullAnswers("K1") }], [{ type: "pause" }]],
  };
  for (const [name, events] of Object.entries(paths)) {
    const { s, stored } = runWithReload("K1", events);
    // học sinh, AI không tự gửi được tín hiệu an toàn
    assert.equal(transition(s, { type: "safety_urgent" }, "student").ok, false, name);
    assert.equal(transition(s, { type: "safety_urgent" }, "ai").ok, false, name);
    const t = transition(s, { type: "safety_urgent" }, "server");
    assert.ok(t.ok && t.next.state === "safety", name);
    // bài đã viết vẫn giữ (không xóa), tải lại vẫn là Chuyển an toàn
    const after = reload(save(t.next, stored));
    assert.equal(after.state, "safety", name);
    assert.deepEqual(after.answers, s.answers, name);
    for (const e of ["start", "next", "skip", "pause", "resume", "feedback", "confirm", "dont_know"] as const) {
      assert.equal(transition(after, { type: e } as PracticeEvent, "student").ok, false, `${name}: ${e}`);
    }
    for (const use of Object.keys(AI_LIMITS) as AiUse[]) assert.equal(aiAllowed(use, {}, after.state), false, `${name}: ${use}`);
  }
  // mọi trạng thái đều có tên hiển thị và có đường tới (28 lần chuyển ở state.test.ts)
  assert.equal(PRACTICE_STATES.length, 7);
});
