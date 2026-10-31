import "server-only";
import { addDays, dayKey, startOfDayIso } from "@/lib/dates";
import { dataScope } from "@/lib/demo/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { allContent } from "@/lib/support-content-server";
import type { Cells } from "@/lib/bai-do";
import { mergeRaters, skillScores } from "@/lib/test-scoring";
import { defaultStyle } from "@/lib/ai/chat-style";
import { getStyleSettings } from "@/lib/assistant";
import { computeDashboard, type DashRows, type Dashboard, type Labels, type Range } from "./dashboard-calc";

// TỔNG QUAN APP: đọc dữ liệu cho 7 khu (kế hoạch Demo 3, 13.2). Phép tính ở lib/dashboard-calc.ts (có test).
// Trang gọi hàm này PHẢI requireStaff(["admin"]) trước. Chỉ đọc cột cần để đếm: không đọc nội dung tin nhắn,
// bài làm, lời nhờ hay ghi chú. Bỏ học sinh lớp thử (classes.is_test) và lớp trình diễn (như trang Kết quả).
// Bảng / cột của các bước khác (practice_sessions 0017, test_scores 0018, content_opens 0019, profiles.chat_style 0020) có thể chưa có:
// khi đó khu tương ứng hiện "Chưa có dữ liệu".

const db = () => createAdminClient();
const PAGE = 1000;
/** Đọc thêm dữ liệu trước khoảng chọn để tính "tuần đầu", giữ chân. */
const HISTORY_DAYS = 120;

type Res<T> = { data: T[] | null; error: { code?: string; message?: string } | null };

/** Đọc hết mọi dòng (Supabase trả tối đa 1000 dòng mỗi lần). */
async function readAll<T>(page: (from: number, to: number) => PromiseLike<Res<T>>): Promise<Res<T>> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) return { data: rows.length ? rows : null, error };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return { data: rows, error: null };
  }
}

export type DashboardClass = { id: string; name: string };

/** Lớp chọn được trong bộ lọc: lớp trong phạm vi, không phải lớp thử. */
async function countedClasses(): Promise<{ classes: DashboardClass[]; testIds: Set<string> }> {
  const scope = await dataScope();
  const demoClasses = new Set(scope.registry?.classIds ?? []);
  type ClassRow = { id: string; name: string; is_test?: boolean };
  const withTest = await db().from("classes").select("id, name, is_test").order("name");
  // chưa chạy 0010 (chưa có cột is_test): coi như không có lớp thử
  const res = withTest.error ? await db().from("classes").select("id, name").order("name") : withTest;
  const rows = (res.data ?? []) as ClassRow[];
  // lớp mẫu (trình diễn) không phải "lớp thử": được tính khi đang trình diễn
  const testIds = new Set(rows.filter((c) => c.is_test && !demoClasses.has(c.id)).map((c) => c.id));
  return { classes: rows.filter((c) => !testIds.has(c.id) && scope.classOk(c.id)).map((c) => ({ id: c.id, name: c.name })), testIds };
}

export async function dashboardClasses(): Promise<DashboardClass[]> {
  return (await countedClasses()).classes;
}

export async function loadDashboard(range: Range, classId: string | null): Promise<{ data: Dashboard; classes: DashboardClass[] }> {
  const today = dayKey();
  const [{ classes }, scope] = await Promise.all([countedClasses(), dataScope()]);
  const allowed = new Set(classes.map((c) => c.id));
  const pick = classId && allowed.has(classId) ? classId : null;
  const since = startOfDayIso(addDays(range.from < today ? range.from : today, -HISTORY_DAYS));

  const [studentsRes, content, lessons, stylesRes, styleSettings] = await Promise.all([
    readAll<{ id: string; class_id: string | null }>((a, b) => db().from("profiles").select("id, class_id").eq("role", "student").order("id").range(a, b)),
    allContent(),
    db().from("lessons").select("slug, title"),
    // lựa chọn trò chuyện (migration 0020): chỉ để đếm; chưa có cột thì khu 3 báo chưa có dữ liệu
    readAll<{ id: string; chat_style: unknown }>((a, b) => db().from("profiles").select("id, chat_style").eq("role", "student").order("id").range(a, b)),
    getStyleSettings(),
  ]);
  // học sinh được tính: trong phạm vi (thật / mẫu), thuộc lớp được tính (bỏ lớp thử), đúng lớp đang lọc
  const students = (studentsRes.data ?? [])
    .filter((s) => scope.userOk(s.id) && s.class_id && allowed.has(s.class_id) && (!pick || s.class_id === pick))
    .map((s) => ({ id: s.id, classId: s.class_id }));
  const counted = new Set(students.map((s) => s.id));
  const mine = <T extends { userId: string }>(rows: T[]) => rows.filter((r) => counted.has(r.userId));

  /** Đọc một bảng từ mốc `since` (có thể thêm một điều kiện cột = giá trị). Bảng chưa có thì trả về error. */
  const q = <T,>(table: string, cols: string, eq?: [string, string]) =>
    readAll<T>((a, b) => {
      let query = db().from(table).select(cols).gte("created_at", since);
      if (eq) query = query.eq(eq[0], eq[1]);
      return query.order("created_at").range(a, b) as unknown as PromiseLike<Res<T>>;
    });

  type U = { user_id: string; created_at: string };
  type HabitRow = { user_id: string; habit_logs: { day: string }[] | null };
  const [checkins, convWithSource, messages, feedback, activity, opens, alerts, help, buttons, worries, checks, habits, harvests, practice, tests] =
    await Promise.all([
      q<U & { emotions: string[] }>("checkins", "user_id, emotions, created_at"),
      q<U & { id: string; source: string | null }>("conversations", "id, user_id, created_at, source"),
      q<{ conversation_id: string; created_at: string; conversations: unknown }>("messages", "conversation_id, created_at, conversations!inner(user_id)", ["role", "user"]),
      q<U & { rating: number }>("message_feedback", "user_id, rating, created_at"),
      q<U & { kind: string; ref: string | null }>("support_activity", "user_id, kind, ref, created_at"),
      q<U & { kind: string; ref: string }>("content_opens", "user_id, kind, ref, created_at"),
      q<{ class_id: string | null; severity: string; created_at: string }>("alerts", "class_id, severity, created_at"),
      q<{ student_id: string | null; created_at: string }>("help_requests", "student_id, created_at"),
      q<U>("student_activity_log", "user_id, created_at", ["kind", "help_button"]),
      q<U & { topic: string }>("worries", "user_id, topic, created_at"),
      q<U & { feeling: string }>("worry_checks", "user_id, feeling, created_at"),
      readAll<HabitRow>((a, b) => db().from("habits").select("user_id, habit_logs(day)").order("id").range(a, b) as unknown as PromiseLike<Res<HabitRow>>),
      q<U>("garden_harvests", "user_id, created_at"),
      // bài luyện (migration 0017): chỉ kỹ năng, trạng thái, thời điểm; không đọc bài làm
      q<U & { skill: string | null; state: string | null; completed_at: string | null }>("practice_sessions", "user_id, skill, state, completed_at, created_at"),
      lockedTestScores(),
    ]);
  // chưa chạy 0019: đọc cuộc trò chuyện không có cột nguồn
  const conversations = convWithSource.error ? await q<U & { id: string }>("conversations", "id, user_id, created_at") : convWithSource;
  for (const [name, r] of Object.entries({ checkins, messages, activity, alerts })) {
    if (r.error) console.error(`[F-Mood] Tổng quan app: đọc ${name} lỗi`, r.error.message);
  }

  const habitLogs = (habits.data ?? []).flatMap((h) => (h.habit_logs ?? []).filter((l) => l.day >= since.slice(0, 10)).map((l) => ({ userId: h.user_id, day: l.day })));

  const rows: DashRows = {
    students,
    checkins: mine((checkins.data ?? []).map((c) => ({ userId: c.user_id, at: c.created_at, emotions: c.emotions ?? [] }))),
    conversations: mine(
      ((conversations.data ?? []) as (U & { id: string; source?: string | null })[]).map((c) => ({ id: c.id, userId: c.user_id, at: c.created_at, source: c.source ?? null })),
    ),
    messages: mine(
      (messages.data ?? []).map((m) => ({
        userId: (m.conversations as { user_id: string }).user_id,
        conversationId: m.conversation_id,
        at: m.created_at,
      })),
    ),
    feedback: mine((feedback.data ?? []).map((f) => ({ userId: f.user_id, at: f.created_at, rating: f.rating }))),
    activity: mine((activity.data ?? []).map((a) => ({ userId: a.user_id, at: a.created_at, kind: a.kind, ref: a.ref }))),
    opens: mine((opens.data ?? []).map((o) => ({ userId: o.user_id, at: o.created_at, kind: o.kind, ref: o.ref }))),
    alerts: (alerts.data ?? []).filter((a) => a.class_id && allowed.has(a.class_id) && (!pick || a.class_id === pick)).map((a) => ({ at: a.created_at, severity: a.severity })),
    helpRequests: mine((help.data ?? []).filter((h) => h.student_id).map((h) => ({ userId: h.student_id as string, at: h.created_at }))),
    helpButtons: mine((buttons.data ?? []).map((b) => ({ userId: b.user_id, at: b.created_at }))),
    worries: mine((worries.data ?? []).map((w) => ({ userId: w.user_id, at: w.created_at, topic: w.topic }))),
    worryChecks: mine((checks.data ?? []).map((c) => ({ userId: c.user_id, at: c.created_at, feeling: c.feeling }))),
    habitLogs: habitLogs.filter((h) => counted.has(h.userId)),
    gardenHarvests: mine((harvests.data ?? []).map((h) => ({ userId: h.user_id, at: h.created_at }))),
    practice: practice.error
      ? null
      : mine((practice.data ?? []).map((p) => ({ userId: p.user_id, at: p.created_at, skill: p.skill, status: p.state, completedAt: p.completed_at }))),
    testScores: tests,
    chatStyles: stylesRes.error ? null : (stylesRes.data ?? []).map((p) => ({ userId: p.id, style: p.chat_style })),
    styleDefault: defaultStyle(styleSettings),
  };

  const labels: Labels = {
    topics: Object.fromEntries(content.items.filter((i) => i.kind === "topic" && i.topic).map((i) => [i.topic as string, String(i.data.label)])),
    actions: Object.fromEntries(
      content.items.filter((i) => i.kind === "tiny_action").map((i) => [i.key, `${typeof i.data.code === "string" ? `${i.data.code} · ` : ""}${String(i.data.title)}`]),
    ),
    lessons: Object.fromEntries(((lessons.data ?? []) as { slug: string; title: string }[]).map((l) => [l.slug, l.title])),
  };

  return { data: computeDashboard(rows, range, today, labels), classes };
}

/**
 * Điểm bài đo trước – sau (migration 0018, trang chấm bài 6.7): CHỈ khi đã khóa điểm. Điểm mỗi bài tính đúng như
 * script 6.3 (lib/test-scoring.ts: gộp hai người chấm từng ô, rồi tổng 4 kỹ năng 0–24); ghép bài với tài khoản và lần đo.
 * Chưa có bảng, chưa khóa điểm hay đọc lỗi → null ("Chưa có dữ liệu"). Không đọc câu trả lời của học sinh.
 */
async function lockedTestScores(): Promise<DashRows["testScores"]> {
  const { data: lock, error: lockError } = await db().from("test_locks").select("locked_at").eq("id", 1).maybeSingle();
  if (lockError || !lock?.locked_at) return null;
  type Score = { response_id: string; slot: number; cells: Cells };
  const scores = await readAll<Score>((a, b) => db().from("test_scores").select("response_id, slot, cells").order("response_id").range(a, b) as unknown as PromiseLike<Res<Score>>);
  const { data: surveys, error: surveyError } = await db().from("surveys").select("id, test_round").eq("kind", "test");
  if (scores.error || surveyError || !scores.data?.length) return null;
  const roundOf = new Map((surveys ?? []).map((s) => [s.id as string, Number(s.test_round)]));
  const bySlot = new Map<string, { 1?: Cells; 2?: Cells }>();
  for (const s of scores.data) bySlot.set(s.response_id, { ...bySlot.get(s.response_id), [s.slot === 2 ? 2 : 1]: s.cells ?? {} });
  const ids = [...bySlot.keys()];
  const owner = new Map<string, { user: string; survey: string }>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await db().from("survey_responses").select("id, user_id, survey_id").in("id", ids.slice(i, i + 200));
    if (error) return null;
    for (const r of data ?? []) owner.set(r.id as string, { user: r.user_id as string, survey: r.survey_id as string });
  }
  const out: { userId: string; round: number; total: number }[] = [];
  for (const [id, slots] of bySlot) {
    const o = owner.get(id);
    const round = o ? roundOf.get(o.survey) : undefined;
    const first = slots[1] ?? slots[2];
    if (!o || (round !== 1 && round !== 2) || !first) continue;
    const total = skillScores(mergeRaters(first, slots[1] ? slots[2] : null)).total;
    if (total != null) out.push({ userId: o.user, round, total: Math.round(total * 100) / 100 });
  }
  return out;
}
