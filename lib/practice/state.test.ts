// Bộ điều phối bài luyện: 4 mô-đun × 7 trạng thái, và không có đường nào để AI đặt "Hoàn thành". Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { SKILL_IDS, SKILLS, type SkillId } from "@/lib/skills";
import {
  AI_LIMITS,
  aiAllowed,
  cleanAnswers,
  emptySnapshot,
  MAX_FEEDBACK,
  MAX_HINTS,
  missingRequired,
  PRACTICE_STATES,
  transition,
  type Actor,
  type Answers,
  type PracticeEvent,
  type PracticeState,
  type Snapshot,
} from "./state";

/** Bài làm đủ mọi ô bắt buộc của mô-đun (chữ tự đặt). */
function fullAnswers(skill: SkillId): Answers {
  return Object.fromEntries(SKILLS[skill].fields.filter((f) => f.required).map((f) => [f.key, `bài làm ô ${f.key}`]));
}

/** Chạy lần lượt các sự kiện, mỗi sự kiện phải chuyển được. */
function run(skill: SkillId, events: [PracticeEvent, Actor?][]): Snapshot {
  let s = emptySnapshot(skill);
  for (const [event, actor = "student"] of events) {
    const t = transition(s, event, actor);
    assert.ok(t.ok, `${skill}: ${event.type} bị từ chối: ${t.ok ? "" : t.reason}`);
    s = t.next;
  }
  return s;
}

const toWriting: [PracticeEvent, Actor?][] = [[{ type: "start" }], [{ type: "next" }], [{ type: "next" }]];

/** Một đường đi tới từng trạng thái (giống nhau cho cả 4 mô-đun, bài làm theo ô của từng mô-đun). */
function pathTo(state: PracticeState, skill: SkillId): [PracticeEvent, Actor?][] {
  switch (state) {
    case "not_started":
      return [];
    case "in_progress":
      return [[{ type: "start" }]];
    case "need_hint":
      return [...toWriting, [{ type: "dont_know" }]];
    case "completed":
      return [...toWriting, [{ type: "submit", answers: fullAnswers(skill) }], [{ type: "next" }], [{ type: "confirm" }]];
    case "skipped":
      return [...toWriting, [{ type: "skip" }]];
    case "paused":
      return [...toWriting, [{ type: "pause" }]];
    case "safety":
      return [...toWriting, [{ type: "safety_urgent" }, "server"]];
  }
}

test("9 mô-đun × 7 trạng thái: 63/63 lần chuyển đúng", () => {
  let count = 0;
  for (const skill of SKILL_IDS) {
    for (const state of PRACTICE_STATES) {
      const s = run(skill, pathTo(state, skill));
      assert.equal(s.state, state, `${skill} → ${state}`);
      count++;
    }
  }
  assert.equal(count, 63);
});

test("AI không bao giờ đổi được trạng thái, kể cả khi bài đã đủ ô", () => {
  const events: PracticeEvent[] = [
    { type: "start" },
    { type: "next" },
    { type: "confirm" },
    { type: "submit", answers: { a: "x" } },
    { type: "feedback" },
    { type: "skip" },
    { type: "pause" },
    { type: "dont_know" },
    { type: "answer", progressed: true },
    { type: "safety_urgent" },
  ];
  for (const skill of SKILL_IDS) {
    // bài đã lưu đủ ô, đang ở bước Nhìn lại: chỉ còn thiếu học sinh xác nhận
    const ready = run(skill, [...toWriting, [{ type: "submit", answers: fullAnswers(skill) }], [{ type: "next" }]]);
    for (const event of events) {
      const t = transition(ready, event, "ai");
      assert.equal(t.ok, false, `${skill}: AI gửi ${event.type}`);
    }
    // máy chủ cũng không tự xác nhận thay học sinh
    assert.equal(transition(ready, { type: "confirm" }, "server").ok, false);
    assert.equal(transition(ready, { type: "confirm" }, "student").ok, true);
  }
});

test("Hoàn thành chỉ khi đủ ô bắt buộc và học sinh xác nhận", () => {
  for (const skill of SKILL_IDS) {
    const required = SKILLS[skill].fields.filter((f) => f.required);
    // thiếu một ô bắt buộc: không xác nhận được
    const partial = { ...fullAnswers(skill) };
    delete partial[required[0].key];
    const s = run(skill, [...toWriting, [{ type: "submit", answers: partial }], [{ type: "next" }]]);
    const t = transition(s, { type: "confirm" }, "student");
    assert.equal(t.ok, false, `${skill}: thiếu ô vẫn hoàn thành`);
    assert.deepEqual(missingRequired(skill, partial), [required[0].key]);
    // chưa lưu bài: không xác nhận được
    assert.equal(transition(run(skill, toWriting), { type: "confirm" }, "student").ok, false);
  }
});

test("Mình chưa biết: tối đa 2 lần trợ lý gợi ý, sau đó cho xem mẫu hoặc bỏ qua", () => {
  let s = run("plan_step_by_step", toWriting);
  const flags: (boolean | undefined)[] = [];
  for (let i = 0; i < MAX_HINTS + 1; i++) {
    const t = transition(s, { type: "dont_know" }, "student");
    assert.ok(t.ok);
    flags.push(t.aiHint);
    s = t.next;
    assert.equal(s.state, "need_hint");
  }
  assert.deepEqual(flags, [true, true, false]);
  assert.equal(s.hintCount, MAX_HINTS);
  // viết tiếp thì về Đang làm; bỏ qua ô thì Bỏ qua
  const wrote = transition(s, { type: "answer", progressed: true }, "student");
  assert.ok(wrote.ok && wrote.next.state === "in_progress");
  const skipped = transition(s, { type: "skip" }, "student");
  assert.ok(skipped.ok && skipped.next.state === "skipped" && skipped.next.step === "T");
});

test("2 lượt liền chưa tiến thì chuyển Cần gợi ý thêm", () => {
  let s = run("recognize_feelings_thoughts", toWriting);
  s = (transition(s, { type: "answer", progressed: false }, "student") as { next: Snapshot }).next;
  assert.equal(s.state, "in_progress");
  const t = transition(s, { type: "answer", progressed: false }, "student");
  assert.ok(t.ok && t.next.state === "need_hint" && t.aiHint === true);
});

test("Góp ý tối đa 2 lượt; lượt 2 chỉ sau khi sửa lần 2", () => {
  const skill: SkillId = "ask_for_help";
  let s = run(skill, [...toWriting, [{ type: "submit", answers: fullAnswers(skill) }], [{ type: "feedback" }]]);
  assert.equal(s.feedbackCount, 1);
  assert.equal(transition(s, { type: "feedback" }, "student").ok, false, "chưa sửa đã góp ý lần 2");
  s = run(skill, [...toWriting, [{ type: "submit", answers: fullAnswers(skill) }], [{ type: "feedback" }], [{ type: "submit", answers: { ...fullAnswers(skill), stuck: "đã sửa" } }], [{ type: "feedback" }]]);
  assert.equal(s.versions, 2);
  assert.equal(s.feedbackCount, MAX_FEEDBACK);
  assert.equal(transition(s, { type: "feedback" }, "student").ok, false, "lượt góp ý thứ 3");
  assert.equal(transition(s, { type: "submit", answers: fullAnswers(skill) }, "student").ok, false, "lần 3");
});

test("Tạm dừng giữ bài, mở lại thì làm tiếp; Chuyển an toàn là trạng thái cuối", () => {
  const skill: SkillId = "calm_in_the_moment";
  const paused = run(skill, [...toWriting, [{ type: "submit", answers: fullAnswers(skill) }], [{ type: "pause" }]]);
  assert.equal(paused.state, "paused");
  assert.equal(paused.versions, 1);
  assert.deepEqual(paused.answers, fullAnswers(skill));
  assert.equal(transition(paused, { type: "feedback" }, "student").ok, false);
  const resumed = transition(paused, { type: "resume" }, "student");
  assert.ok(resumed.ok && resumed.next.state === "in_progress" && resumed.next.step === "G");

  const safe = run(skill, [...toWriting, [{ type: "safety_urgent" }, "server"]]);
  for (const e of [{ type: "resume" }, { type: "submit", answers: fullAnswers(skill) }, { type: "confirm" }, { type: "next" }] as PracticeEvent[]) {
    assert.equal(transition(safe, e, "student").ok, false, e.type);
  }
  // học sinh không tự gửi được tín hiệu an toàn (chỉ máy chủ)
  assert.equal(transition(run(skill, toWriting), { type: "safety_urgent" }, "student").ok, false);
});

test("lượt gọi AI có giới hạn và dừng hẳn khi chuyển an toàn hoặc tạm dừng", () => {
  assert.equal(aiAllowed("bridge", {}, "in_progress"), true);
  assert.equal(aiAllowed("bridge", { bridge: AI_LIMITS.bridge }, "in_progress"), false);
  assert.equal(aiAllowed("roleplay", { roleplay: 3 }, "in_progress"), true);
  assert.equal(aiAllowed("roleplay", { roleplay: 4 }, "in_progress"), false);
  assert.equal(aiAllowed("example", {}, "safety"), false);
  assert.equal(aiAllowed("example", {}, "paused"), false);
});

test("bài làm chỉ giữ ô của mô-đun, bỏ khoảng trắng thừa, cắt độ dài", () => {
  const a = cleanAnswers("plan_step_by_step", { tasks: "  Toán   và  Văn ", order: "", hack: "x", first: 5, backup: "a".repeat(900) });
  assert.deepEqual(Object.keys(a).sort(), ["backup", "tasks"]);
  assert.equal(a.tasks, "Toán và Văn");
  assert.equal(a.backup.length, 600);
});
