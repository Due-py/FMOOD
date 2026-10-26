// Dữ liệu mẫu cho chế độ trình diễn: đúng câu chuyện đã định, không có câu nguy hiểm thật,
// không trỏ tới tài khoản nào ngoài tài khoản mẫu. Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, dayKey } from "@/lib/dates";
import { retentionWeek1, surveyMetric, teacherResponse, worriesLighter } from "@/lib/effect/metrics";
import { pairSurveys, parseSurveyCsv } from "@/lib/effect/survey";
import { keywordCheck } from "@/lib/safety/keywords";
import { buildDemo, DEMO_CLASSES, knownEmotion, type DemoData } from "./generate";
import { isDemoCode, shiftIso, SIMULATED } from "./shared";
import { demoSurveys } from "./surveys";

const NOW = new Date("2026-10-26T09:30:00+07:00");
const ACTIONS = {
  "hoc-tap": ["action.hoc-tap.chia-nho", "action.hoc-tap.hoc-10-nghi-2"],
  "ban-be": ["action.ban-be.hai-phia"],
  "gia-dinh": ["action.gia-dinh.viet-ra"],
  "ban-than": ["action.ban-than.tho-cham"],
};
function build(now = NOW): DemoData {
  let n = 0;
  const newId = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
  return buildDemo({ now, newId, plantIds: ["cay-1", "cay-2", "cay-3"], actions: ACTIONS });
}
const data = build();
const nowMs = NOW.getTime();
const DAY = 86_400_000;

test("3 lớp mẫu đúng sĩ số, mã MAU-, mỗi lớp có GVCN mẫu; có 1 tư vấn viên mẫu", () => {
  assert.deepEqual(
    data.classes.map((c) => [c.name, data.students.filter((s) => s.class_id === c.id).length]),
    DEMO_CLASSES.map((c) => [c.name, c.size]),
  );
  for (const c of data.classes) {
    assert.ok(isDemoCode(c.code) && c.code.length <= 12, c.code);
    assert.equal(data.staff.find((s) => s.id === c.homeroom_teacher_id)?.role, "teacher");
  }
  assert.equal(data.staff.filter((s) => s.role === "counselor").length, 1);
  assert.equal(new Set(data.students.map((s) => s.nickname)).size, data.students.length, "biệt danh không trùng");
});

test("cùng hạt giống và cùng lúc tạo → ra đúng cùng một bộ dữ liệu", () => {
  assert.deepEqual(build(), data);
});

test("mọi dòng chỉ trỏ tới lớp và tài khoản mẫu", () => {
  const users = new Set([...data.students, ...data.staff].map((p) => p.id));
  const classes = new Set(data.classes.map((c) => c.id));
  const tables = Object.entries(data).filter(([, v]) => Array.isArray(v)) as [string, Record<string, unknown>[]][];
  for (const [name, rows] of tables) {
    for (const r of rows) {
      for (const col of ["user_id", "student_id", "author_id", "handled_by", "replied_by", "actor_id"]) {
        if (r[col] != null) assert.ok(users.has(r[col] as string), `${name}.${col}`);
      }
      if (r.class_id != null) assert.ok(classes.has(r.class_id as string), `${name}.class_id`);
    }
  }
});

test("mọi mốc thời gian nằm trong 31 ngày qua; lần hỏi lại kế tiếp không quá 3 ngày tới", () => {
  const tables = Object.entries(data).filter(([, v]) => Array.isArray(v)) as [string, Record<string, unknown>[]][];
  for (const [name, rows] of tables) {
    for (const r of rows) {
      for (const col of ["created_at", "updated_at", "handled_at", "replied_at", "earned_at"]) {
        const v = r[col] as string | null | undefined;
        if (!v) continue;
        const ms = Date.parse(v);
        assert.ok(ms <= nowMs && ms >= nowMs - 31 * DAY, `${name}.${col} = ${v}`);
      }
    }
  }
  for (const w of data.worries) if (w.next_check_at) assert.ok(Date.parse(w.next_check_at as string) <= nowMs + 3 * DAY);
});

test("KHÔNG có câu nguy hiểm thật: mọi chữ học sinh 'viết' đều qua bộ lọc từ khóa ở mức bình thường", () => {
  const texts = [
    ...data.messages.filter((m) => m.role === "user" && !m.flagged).map((m) => m.content as string),
    ...data.worries.map((w) => w.note as string | null),
    ...data.reflection_answers.map((r) => r.answer as string),
    ...data.help_requests.map((h) => h.note as string | null),
    ...data.conversations.map((c) => c.title as string),
  ].filter((x): x is string => Boolean(x));
  assert.ok(texts.length > 100);
  for (const text of texts) assert.equal(keywordCheck(text).level, "none", text);
});

test("tin nhắn bị gắn cờ và đoạn trích cảnh báo chỉ là dòng giả lập", () => {
  const flagged = data.messages.filter((m) => m.flagged);
  assert.ok(flagged.length >= 3);
  for (const m of flagged) assert.ok((m.content as string).startsWith(SIMULATED));
  for (const a of data.alerts) {
    const ex = a.excerpt as string | null;
    if (ex) assert.ok(ex.startsWith(SIMULATED) || ex.startsWith("Mây hỏi thăm"), ex);
  }
});

test("cảm xúc, chủ đề, giá trị đều là giá trị app chấp nhận", () => {
  for (const c of data.checkins) for (const e of c.emotions as string[]) assert.ok(knownEmotion(e), e);
  for (const w of data.worries) {
    assert.ok((w.level_start as number) >= 1 && (w.level_start as number) <= 5);
    assert.ok(["open", "better", "done", "stale"].includes(w.status as string));
  }
  for (const a of data.support_activity) assert.ok(["worry_saved", "tiny_action_done", "followup_answered", "told", "topic_guess_yes", "topic_guess_no"].includes(a.kind as string));
  for (const h of data.help_requests) assert.ok(!h.note || (h.note as string).length <= 300);
});

test("không trùng khóa: một check-in suy ngẫm mỗi ngày, một dấu tick thói quen mỗi ngày, một huy hiệu mỗi loại", () => {
  const uniq = (rows: Record<string, unknown>[], key: (r: Record<string, unknown>) => string) => new Set(rows.map(key)).size === rows.length;
  assert.ok(uniq(data.reflection_answers, (r) => `${r.user_id}|${r.day}`));
  assert.ok(uniq(data.habit_logs, (r) => `${r.habit_id}|${r.day}`));
  assert.ok(uniq(data.badges_earned, (r) => `${r.user_id}|${r.badge_key}`));
  assert.ok(uniq(data.survey_responses, (r) => `${r.survey_id}|${r.user_id}`));
  assert.ok(uniq(data.message_feedback, (r) => String(r.message_id)));
});

test("bạn được kể chuyện: 2 chuyện đã nhẹ đi, 1 chuyện vừa kể hôm nay CHƯA tới hạn; tua 7 ngày thì tới hạn", () => {
  const id = data.showcase.journey;
  const mine = data.worries.filter((w) => w.user_id === id);
  assert.equal(mine.length, 3);
  assert.deepEqual(mine.map((w) => w.status), ["better", "done", "open"]);
  const open = mine.find((w) => w.status === "open")!;
  const due = Date.parse(open.next_check_at as string);
  assert.ok(due > nowMs, "chưa tới hạn: trang chủ chưa hỏi");
  assert.ok(Date.parse(shiftIso(open.next_check_at as string, -7)!) <= nowMs, "tua 7 ngày: tới hạn");
  const badges = data.badges_earned.filter((b) => b.user_id === id).map((b) => b.badge_key);
  for (const b of ["goi-ten-cam-xuc", "dam-ke", "thu-viec-nho", "quay-lai-hoi-tham", "nhe-long-hon", "cay-cau", "nguoi-lam-vuon"]) assert.ok(badges.includes(b), b);
});

test("huy hiệu 'Nhẹ lòng hơn' chỉ có khi thật sự có lần hỏi lại thấp hơn lúc kể", () => {
  for (const b of data.badges_earned.filter((x) => x.badge_key === "nhe-long-hon")) {
    const worries = new Map(data.worries.filter((w) => w.user_id === b.user_id).map((w) => [w.id, w.level_start as number]));
    assert.ok(data.worry_checks.some((c) => c.user_id === b.user_id && (c.level as number) < (worries.get(c.worry_id as string) ?? 0) && c.feeling !== "worse"));
  }
});

test("số liệu ra đúng câu chuyện: còn dùng sau 1 tuần Đạt, chuyện nhẹ đi Đạt, cảnh báo khẩn chỉ 3 → Chưa đủ dữ liệu", () => {
  const today = dayKey(NOW);
  const days = new Map<string, Set<string>>();
  const add = (u: string, iso: string) => days.set(u, (days.get(u) ?? new Set()).add(dayKey(iso)));
  for (const c of data.checkins) add(c.user_id as string, c.created_at as string);
  const conv = new Map(data.conversations.map((c) => [c.id, c.user_id as string]));
  for (const m of data.messages) if (m.role === "user") add(conv.get(m.conversation_id as string)!, m.created_at as string);
  const retention = retentionWeek1(new Map([...days].map(([u, s]) => [u, [...s]])), today);
  assert.equal(retention.status, "dat", retention.value);

  const last = new Map<string, number>();
  for (const c of [...data.worry_checks].sort((a, b) => Date.parse(a.created_at as string) - Date.parse(b.created_at as string))) last.set(c.worry_id as string, c.level as number);
  const lighter = worriesLighter(data.worries.map((w) => ({ userId: w.user_id as string, levelStart: w.level_start as number, lastLevel: last.get(w.id as string) ?? null })));
  assert.equal(lighter.status, "dat", lighter.value);

  const urgent = data.alerts.filter((a) => a.severity === "urgent");
  assert.equal(urgent.length, 3);
  const resp = teacherResponse(
    data.alerts.map((a) => ({ severity: a.severity as "watch" | "urgent", created_at: a.created_at as string, first_handled_at: a.first_handled_at as string | null })),
    nowMs,
  );
  assert.equal(resp.status, "chua-du");
  assert.ok(data.alerts.some((a) => a.status === "new"), "có cảnh báo mới để thầy cô xử lý khi trình diễn");
});

test("Mây đoán chủ đề: đủ 5 bạn trả lời và ít nhất 70% bấm 'Đúng rồi'", () => {
  const rows = data.support_activity.filter((a) => (a.kind as string).startsWith("topic_guess"));
  const yes = rows.filter((a) => a.kind === "topic_guess_yes").length;
  assert.ok(new Set(rows.map((r) => r.user_id)).size >= 5);
  assert.ok(yes / rows.length >= 0.7, `${yes}/${rows.length}`);
});

test("có ngày dưới 5 bạn check-in (trang thầy cô phải ẩn) và ngày đủ 5 bạn trong 7 ngày qua", () => {
  const today = dayKey(NOW);
  const perDay = new Map<string, Set<string>>();
  const classOf = new Map(data.students.map((s) => [s.id, s.class_id]));
  for (const c of data.checkins) {
    const d = dayKey(c.created_at as string);
    if (d < addDays(today, -6)) continue;
    const key = `${classOf.get(c.user_id as string)}|${d}`;
    perDay.set(key, (perDay.get(key) ?? new Set()).add(c.user_id as string));
  }
  const sizes = [...perDay.values()].map((s) => s.size);
  assert.ok(sizes.some((n) => n < 5), "có ngày ít bạn");
  assert.ok(sizes.some((n) => n >= 5), "có ngày đủ bạn");
});

test("phiếu khảo sát mẫu: đọc bằng đúng code đọc phiếu thật; WHO-5 và PSS-4 Đạt, tìm đến thầy cô Chưa đạt", () => {
  const s = demoSurveys();
  const pre = parseSurveyCsv(s.pre);
  const post = parseSurveyCsv(s.post);
  assert.equal(pre.error, undefined);
  assert.equal(post.error, undefined);
  assert.equal(pre.skipped.test, 1, "dòng thử phiếu bị bỏ");
  assert.ok(post.skipped.duplicate >= 1, "phiếu gửi hai lần bị bỏ");
  const { pairs } = pairSurveys(pre.rows, post.rows, (c) => {
    const g = s.groups[c];
    return g === "app" || g === "control" ? g : null;
  });
  assert.ok(pairs.filter((p) => p.group === "control").length >= 5);
  const who5 = surveyMetric("who5", pairs);
  const pss4 = surveyMetric("pss4", pairs);
  const help = surveyMetric("helpTeacher", pairs);
  assert.equal(who5.status, "dat", who5.value);
  assert.equal(pss4.status, "dat", pss4.value);
  assert.equal(help.status, "chua-dat", help.value);
  assert.deepEqual(demoSurveys(), s, "cùng hạt giống → cùng phiếu");
});
