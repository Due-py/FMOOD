// Lớp mẫu "7 ngày": đúng 20 bạn, dữ liệu đi đúng quy tắc của app, không có câu nguy hiểm thật. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { ACTIVITY_KINDS } from "@/lib/activity-log-shared";
import { CONVERSATION_SOURCES } from "@/lib/chat-source";
import { keywordCheck } from "@/lib/safety/keywords";
import { SKILLS, type SkillCode } from "@/lib/skills";
import { knownEmotion } from "./generate";
import { isDemoCode } from "./shared";
import { buildWeek, practiceTextProblems, WEEK_DAYS, WEEK_PEOPLE, type WeekData } from "./week";

const NOW = new Date("2026-10-31T21:40:00+07:00");
const DAY = 86_400_000;
function build(now = NOW): WeekData {
  let n = 0;
  const newId = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
  return buildWeek({
    now,
    newId,
    plantIds: ["cay-1", "cay-2"],
    actions: [
      { key: "action.chung.hit-tho-hop", topic: null, code: "HD07" },
      { key: "action.hoc-tap.chia-nho", topic: "hoc-tap", code: "HD11" },
      { key: "action.ban-be.hai-phia", topic: "ban-be", code: "HD15" },
    ],
    lessons: ["w6-1a-ve-sinh-giac-ngu", "w6-1c-cang-thang-va-co-the"],
    counselorId: "tu-van-mau",
    counselorName: "Cô Thảo · tư vấn (mẫu)",
  });
}
const data = build();
const nowMs = NOW.getTime();
const tables = Object.entries(data).filter(([, v]) => Array.isArray(v)) as [string, Record<string, unknown>[]][];

/** Loại việc support_activity được phép sau migration 0020. */
const SUPPORT_KINDS = [
  "worry_saved", "tiny_action_done", "followup_answered", "told", "topic_guess_yes", "topic_guess_no",
  "misunderstood", "chat_skip", "chat_stop", "difficulty_confirmed", "tiny_action_skipped", "tiny_action_reflect",
  "practice_done", "practice_feedback", "practice_revised", "practice_completed", "style_changed", "card_shown", "card_clicked",
];

test("đúng 20 bạn, biệt danh không trùng và đăng nhập được (2–24 ký tự); một lớp MAU- có GVCN mẫu", () => {
  assert.equal(data.students.length, 20);
  assert.equal(new Set(data.students.map((s) => s.nickname.toLowerCase())).size, 20);
  for (const p of WEEK_PEOPLE) assert.ok(p.nickname.length >= 2 && p.nickname.length <= 24, p.nickname);
  assert.ok(isDemoCode(data.classRow.code) && data.classRow.code.length <= 12, data.classRow.code);
  assert.equal(data.classRow.homeroom_teacher_id, data.teacher.id);
});

test("cùng hạt giống và cùng lúc tạo → ra đúng cùng một bộ dữ liệu", () => {
  assert.deepEqual(build(), data);
});

test("mọi dòng chỉ trỏ tới lớp và tài khoản mẫu", () => {
  const users = new Set([...data.students.map((s) => s.id), data.teacher.id, "tu-van-mau"]);
  for (const [name, rows] of tables) {
    for (const r of rows) {
      for (const col of ["user_id", "student_id", "replied_by", "actor_id"]) if (r[col] != null) assert.ok(users.has(r[col] as string), `${name}.${col}`);
      if (r.class_id != null) assert.equal(r.class_id, data.classRow.id, `${name}.class_id`);
    }
  }
});

test("mọi mốc thời gian nằm trong 7 ngày qua, không ở tương lai; ai cũng bắt đầu từ ngày vào lớp", () => {
  for (const [name, rows] of tables) {
    for (const r of rows) {
      for (const col of ["created_at", "updated_at", "replied_at", "earned_at", "completed_at", "followup_at"]) {
        const v = r[col] as string | null | undefined;
        if (!v) continue;
        const ms = Date.parse(v);
        assert.ok(ms <= nowMs && ms >= nowMs - (WEEK_DAYS + 1) * DAY, `${name}.${col} = ${v}`);
      }
    }
  }
  const joined = new Map(data.students.map((s) => [s.id, Date.parse(s.created_at)]));
  for (const [name, rows] of tables) {
    for (const r of rows) {
      const who = (r.user_id ?? r.student_id) as string | undefined;
      if (who && joined.has(who) && r.created_at) assert.ok(Date.parse(r.created_at as string) >= (joined.get(who) as number), `${name} trước ngày vào lớp`);
    }
  }
});

test("KHÔNG có câu nguy hiểm thật: mọi chữ học sinh 'viết' đều qua bộ lọc từ khóa ở mức bình thường", () => {
  const answers = data.practice_attempts.flatMap((a) => Object.values(a.answers as Record<string, string>));
  const texts = [
    ...data.messages.filter((m) => m.role === "user").map((m) => m.content as string),
    ...data.worries.map((w) => w.note as string | null),
    ...data.reflection_answers.map((r) => r.answer as string),
    ...data.help_requests.map((h) => h.note as string | null),
    ...data.practice_sessions.map((s) => s.next_try as string | null),
    ...answers,
  ].filter((x): x is string => Boolean(x));
  assert.ok(texts.length > 150, String(texts.length));
  for (const text of texts) assert.equal(keywordCheck(text).level, "none", text);
});

test("giá trị đều là giá trị app và cơ sở dữ liệu chấp nhận", () => {
  for (const c of data.checkins) for (const e of c.emotions as string[]) assert.ok(knownEmotion(e), e);
  for (const a of data.support_activity) assert.ok(SUPPORT_KINDS.includes(a.kind as string), a.kind as string);
  for (const l of data.student_activity_log) {
    assert.ok((l.kind as string) in ACTIVITY_KINDS, l.kind as string);
    assert.ok(!l.ref || (l.ref as string).length <= 60);
  }
  for (const c of data.conversations) assert.ok((CONVERSATION_SOURCES as readonly string[]).includes(c.source as string), c.source as string);
  for (const o of data.content_opens) assert.ok(/^[A-Za-z0-9._-]{1,80}$/.test(o.ref as string) && ["lesson", "tiny_action"].includes(o.kind as string));
  for (const w of data.worries) assert.ok(["open", "better", "done", "stale"].includes(w.status as string));
});

test("bài luyện đi đúng các bước: xong thì ở bước N, đủ ô bắt buộc ở lần cuối, K3 có hai cách; góp ý tối đa 2 lần", () => {
  assert.deepEqual(practiceTextProblems(), []);
  assert.ok(data.practice_sessions.length >= 30, String(data.practice_sessions.length));
  for (const s of data.practice_sessions) {
    const skill = s.skill as SkillCode;
    const attempts = data.practice_attempts.filter((a) => a.session_id === s.id).sort((a, b) => (a.version as number) - (b.version as number));
    assert.ok(/^TL[0-9]{2}$/.test(s.case_code as string));
    assert.ok((s.feedback_count as number) <= 2);
    if (s.state === "completed") {
      assert.equal(s.step, "N");
      assert.ok(s.completed_at && s.next_try);
      const last = attempts.at(-1)?.answers as Record<string, string>;
      for (const f of SKILLS[skill].fields.filter((x) => x.required)) assert.ok(last?.[f.key]?.trim(), `${skill} thiếu ${f.key}`);
      if (skill === "K3") assert.ok(/Cách 1[\s\S]*Cách 2/.test(last.options), "K3 phải có hai cách");
    }
    if (s.state === "paused") assert.equal(attempts.length, 0);
    if (s.followup_used) assert.ok(s.state === "completed" && Date.parse(s.followup_at as string) > Date.parse(s.completed_at as string));
  }
  // mọi kỹ năng đều có người luyện xong
  for (const k of ["K1", "K2", "K3", "K4"]) assert.ok(data.practice_sessions.some((s) => s.skill === k && s.state === "completed"), k);
});

test("có đủ kiểu người dùng: bạn bỏ dở chỉ dùng 3 ngày đầu, bạn vào muộn bắt đầu từ ngày 3", () => {
  const lastAt = (id: string) => Math.max(...data.student_activity_log.filter((l) => l.user_id === id).map((l) => Date.parse(l.created_at as string)));
  for (const s of data.students.filter((x) => x.story === "bỏ dở")) assert.ok(lastAt(s.id) < nowMs - 4 * DAY);
  const late = data.students.find((x) => x.story === "muộn");
  assert.ok(late && Date.parse(late.created_at) > nowMs - 5 * DAY);
  // không trùng khóa
  const uniq = (rows: Record<string, unknown>[], key: (r: Record<string, unknown>) => string) => new Set(rows.map(key)).size === rows.length;
  assert.ok(uniq(data.reflection_answers, (r) => `${r.user_id}|${r.day}`));
  assert.ok(uniq(data.habit_logs, (r) => `${r.habit_id}|${r.day}`));
  assert.ok(uniq(data.badges_earned, (r) => `${r.user_id}|${r.badge_key}`));
  assert.ok(uniq(data.practice_attempts, (r) => `${r.session_id}|${r.version}`));
});
