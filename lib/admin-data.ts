import "server-only";
import { addDays, dayKey, startOfDayIso } from "@/lib/dates";
import { countGroups, type EmotionGroup } from "@/lib/emotions";
import { LESSON_COLUMNS, type Lesson } from "@/lib/lessons";
import type { Plant } from "@/lib/garden";
import type { Scenario } from "@/lib/scenarios";
import type { Survey, SurveyAnswers } from "@/lib/surveys";
import { createAdminClient } from "@/lib/supabase/admin";
import { allContent } from "@/lib/support-content-server";
import { supportLoopStats, type SupportLoopStats } from "@/lib/support-stats";
import type { Feeling } from "@/lib/worries-shared";

// ĐỌC DỮ LIỆU CHO CÁC TRANG ADMIN. Trang gọi các hàm này PHẢI requireStaff(["admin"]) trước
// (riêng researchMetrics, supportLoopMetrics cho cả phòng tham vấn). Không hàm nào trả về nội dung riêng tư
// của học sinh (check-in, tin nhắn, câu trả lời suy ngẫm) theo từng người.

const db = () => createAdminClient();

export async function allLessons(): Promise<Lesson[]> {
  const { data } = await db().from("lessons").select(LESSON_COLUMNS).order("grade", { nullsFirst: true }).order("sort_order");
  return (data ?? []) as Lesson[];
}

export async function lessonById(id: string): Promise<Lesson | null> {
  const { data } = await db().from("lessons").select(LESSON_COLUMNS).eq("id", id).maybeSingle();
  return (data as Lesson | null) ?? null;
}

export async function reflectionQuestions() {
  const { data } = await db().from("reflection_questions").select("id, text, active, sort_order").order("sort_order").order("created_at");
  const { count } = await db().from("reflection_answers").select("id", { count: "exact", head: true });
  return { questions: data ?? [], totalAnswers: count ?? 0 };
}

export async function gardenPlants(): Promise<(Plant & { active: boolean; sort_order: number; growing: number })[]> {
  const [{ data: plants }, { data: profiles }] = await Promise.all([
    db().from("garden_plants").select("id, name, stages, active, sort_order").order("sort_order"),
    db().from("profiles").select("garden_plant_id").eq("role", "student"),
  ]);
  return ((plants ?? []) as (Plant & { active: boolean; sort_order: number })[]).map((p) => ({
    ...p,
    growing: (profiles ?? []).filter((x) => x.garden_plant_id === p.id).length,
  }));
}

export async function allScenarios(): Promise<Scenario[]> {
  const { data } = await db().from("scenarios").select("id, title, triggers, guidance, active").order("created_at");
  return (data ?? []) as Scenario[];
}

export type KbDoc = {
  id: string;
  title: string;
  filename: string | null;
  chunk_count: number;
  status: "pending" | "ready" | "error";
  error: string | null;
  active: boolean;
  created_at: string;
  trained_at: string | null;
  chars: number;
};

export async function kbDocuments(): Promise<KbDoc[]> {
  // không lấy cả nội dung (có thể rất dài), chỉ độ dài
  const { data } = await db()
    .from("kb_documents")
    .select("id, title, filename, chunk_count, status, error, active, created_at, trained_at, content")
    .order("created_at", { ascending: false });
  return (data ?? []).map(({ content, ...d }) => ({ ...d, chars: (content as string).length }) as KbDoc);
}

export async function kbSummary() {
  const docs = await kbDocuments();
  const ready = docs.filter((d) => d.status === "ready" && d.active);
  const trained = docs.map((d) => d.trained_at).filter(Boolean).sort().at(-1) ?? null;
  return { total: docs.length, ready: ready.length, chunks: ready.reduce((s, d) => s + d.chunk_count, 0), lastTrained: trained };
}

// ───────────────────────── Tình trạng Mây ─────────────────────────

export type AiHealth = {
  windowHours: number;
  byKind: { kind: string; calls: number; errors: number; avgLatency: number | null; inputTokens: number; outputTokens: number }[];
  daily: { day: string; chat: number; errors: number }[];
  recentErrors: { kind: string; model: string | null; error: string | null; created_at: string }[];
  db: { ok: boolean; latencyMs: number };
};

export async function aiHealth(): Promise<AiHealth> {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const start = Date.now();
  const { data, error } = await db()
    .from("ai_logs")
    .select("kind, model, ok, latency_ms, input_tokens, output_tokens, error, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(5000);
  const dbLatency = Date.now() - start;
  const rows = data ?? [];

  const kinds = ["chat", "suggestions", "classifier", "moderation", "embedding", "health"];
  const byKind = kinds.map((kind) => {
    const r = rows.filter((x) => x.kind === kind);
    const lat = r.filter((x) => x.ok && x.latency_ms != null).map((x) => x.latency_ms as number);
    return {
      kind,
      calls: r.length,
      errors: r.filter((x) => !x.ok).length,
      avgLatency: lat.length ? Math.round(lat.reduce((s, v) => s + v, 0) / lat.length) : null,
      inputTokens: r.reduce((s, x) => s + (x.input_tokens ?? 0), 0),
      outputTokens: r.reduce((s, x) => s + (x.output_tokens ?? 0), 0),
    };
  });

  const today = dayKey();
  const daily = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i - 6);
    const r = rows.filter((x) => x.kind === "chat" && dayKey(x.created_at) === day);
    return { day, chat: r.length, errors: r.filter((x) => !x.ok).length };
  });

  return {
    windowHours: 24 * 7,
    byKind,
    daily,
    recentErrors: rows.filter((x) => !x.ok).slice(0, 8),
    db: { ok: !error, latencyMs: dbLatency },
  };
}

// ───────────────────────── Khảo sát ─────────────────────────

export async function allSurveys(): Promise<(Survey & { responses: number })[]> {
  const [{ data: surveys }, { data: responses }] = await Promise.all([
    db().from("surveys").select("id, title, description, questions, class_ids, status, created_at").order("created_at", { ascending: false }),
    db().from("survey_responses").select("survey_id"),
  ]);
  return ((surveys ?? []) as Survey[]).map((s) => ({
    ...s,
    responses: (responses ?? []).filter((r) => r.survey_id === s.id).length,
  }));
}

export async function surveyWithResults(id: string) {
  const [{ data: survey }, { data: responses }] = await Promise.all([
    db().from("surveys").select("id, title, description, questions, class_ids, status, created_at").eq("id", id).maybeSingle(),
    db().from("survey_responses").select("answers, class_id, created_at, classes(name)").eq("survey_id", id),
  ]);
  if (!survey) return null;
  // KHÔNG trả user_id: kết quả khảo sát hiển thị ẩn danh
  return {
    survey: survey as Survey,
    responses: (responses ?? []).map((r) => ({
      answers: r.answers as SurveyAnswers,
      className: (r.classes as unknown as { name: string } | null)?.name ?? null,
      created_at: r.created_at as string,
    })),
  };
}

// ───────────────────────── Bộ thử ─────────────────────────

export async function evalData() {
  const [{ data: cases }, { data: runs }] = await Promise.all([
    db().from("eval_cases").select("id, input, expected, note, active").order("created_at"),
    db().from("eval_runs").select("id, model, total, passed, results, run_by_name, created_at").order("created_at", { ascending: false }).limit(10),
  ]);
  return { cases: cases ?? [], runs: runs ?? [] };
}

// ───────────────────────── Thành viên ─────────────────────────

export async function allStudents() {
  const { data } = await db()
    .from("profiles")
    .select("id, nickname, full_name, class_id, created_at, locked_at, classes!profiles_class_id_fkey(name)")
    .eq("role", "student")
    .order("nickname");
  return (data ?? []).map((s) => ({
    id: s.id as string,
    nickname: s.nickname as string,
    full_name: s.full_name as string | null,
    class_id: s.class_id as string | null,
    class_name: (s.classes as unknown as { name: string } | null)?.name ?? null,
    created_at: s.created_at as string,
    locked_at: s.locked_at as string | null,
  }));
}

export async function recentAudit(limit = 8) {
  const { data } = await db().from("admin_audit").select("actor_name, action, detail, created_at").order("created_at", { ascending: false }).limit(limit);
  return data ?? [];
}

// ───────────────────────── Kết quả nghiên cứu ─────────────────────────

export type ResearchMetrics = {
  students: number;
  activeStudents: { week: number; month: number };
  weekly: { week: string; active: number; checkins: number; chats: number }[];
  retention: { cohort: number; returned: number } | null;
  checkinsPerActive: number;
  groups: Record<EmotionGroup, number>;
  habits: { total: number; withStreak3: number; avgLogsPerHabit: number };
  reflections: number;
  alerts: { total: number; urgent: number; resolved: number; medianHandleHours: number | null };
  surveys: { count: number; responses: number };
  feedback: { ups: number; downs: number; reasons: { reason: string; count: number }[] };
};

const MIN_GROUP = 3;

/**
 * Số liệu tổng hợp ẩn danh để trả lời các câu hỏi đánh giá trong đề cương
 * (học sinh có tự dùng được, có quay lại, có giữ thói quen, có tìm đến người lớn...).
 */
export async function researchMetrics(): Promise<ResearchMetrics> {
  const today = dayKey();
  const since = startOfDayIso(addDays(today, -55)); // 8 tuần
  const [students, checkins, messages, habits, reflections, alerts, surveys, responses, feedback] = await Promise.all([
    db().from("profiles").select("id, created_at").eq("role", "student"),
    db().from("checkins").select("user_id, emotions, created_at").gte("created_at", since),
    db().from("messages").select("created_at, conversations!inner(user_id)").eq("role", "user").gte("created_at", since),
    db().from("habits").select("id, habit_logs(day)"),
    db().from("reflection_answers").select("id", { count: "exact", head: true }),
    db().from("alerts").select("severity, status, created_at, handled_at"),
    db().from("surveys").select("id", { count: "exact", head: true }),
    db().from("survey_responses").select("id", { count: "exact", head: true }),
    db().from("message_feedback").select("rating, reason"),
  ]);
  const fb = feedback.data ?? [];
  const reasonTally = new Map<string, number>();
  for (const f of fb) if (f.rating === -1 && f.reason) reasonTally.set(f.reason, (reasonTally.get(f.reason) ?? 0) + 1);

  const ci = checkins.data ?? [];
  const msgs = (messages.data ?? []).map((m) => ({
    user: (m.conversations as unknown as { user_id: string }).user_id,
    created_at: m.created_at as string,
  }));

  const activeIn = (fromDay: string, toDay: string) => {
    const set = new Set<string>();
    for (const c of ci) {
      const d = dayKey(c.created_at);
      if (d >= fromDay && d <= toDay) set.add(c.user_id);
    }
    for (const m of msgs) {
      const d = dayKey(m.created_at);
      if (d >= fromDay && d <= toDay) set.add(m.user);
    }
    return set;
  };

  const weekly = Array.from({ length: 8 }, (_, i) => {
    const end = addDays(today, -7 * (7 - i));
    const startDay = addDays(end, -6);
    const inRange = (iso: string) => {
      const d = dayKey(iso);
      return d >= startDay && d <= end;
    };
    const active = activeIn(startDay, end).size;
    return {
      week: startDay,
      active: active >= MIN_GROUP || active === 0 ? active : -1, // -1 = quá ít để hiện
      checkins: ci.filter((c) => inRange(c.created_at)).length,
      chats: msgs.filter((m) => inRange(m.created_at)).length,
    };
  });

  const weekActive = activeIn(addDays(today, -6), today);
  const monthActive = activeIn(addDays(today, -29), today);

  // quay lại: học sinh hoạt động ở tuần trước, có hoạt động tiếp trong tuần này
  const prev = activeIn(addDays(today, -13), addDays(today, -7));
  const returned = [...prev].filter((u) => weekActive.has(u)).length;

  const groupIds = ci.filter((c) => dayKey(c.created_at) >= addDays(today, -29)).flatMap((c) => c.emotions as string[]);

  const habitRows = habits.data ?? [];
  const streakOf = (days: string[]) => {
    const set = new Set(days);
    let best = 0;
    for (const d of set) {
      if (set.has(addDays(d, -1))) continue;
      let len = 0;
      let cur = d;
      while (set.has(cur)) {
        len++;
        cur = addDays(cur, 1);
      }
      best = Math.max(best, len);
    }
    return best;
  };
  const logsPer = habitRows.map((h) => ((h.habit_logs as { day: string }[]) ?? []).map((l) => l.day));

  const al = alerts.data ?? [];
  const handleHours = al
    .filter((a) => a.handled_at)
    .map((a) => (Date.parse(a.handled_at as string) - Date.parse(a.created_at as string)) / 3_600_000)
    .sort((a, b) => a - b);

  return {
    students: students.data?.length ?? 0,
    activeStudents: { week: weekActive.size, month: monthActive.size },
    weekly,
    retention: prev.size >= MIN_GROUP ? { cohort: prev.size, returned } : null,
    checkinsPerActive: monthActive.size
      ? Math.round((ci.filter((c) => dayKey(c.created_at) >= addDays(today, -29)).length / monthActive.size) * 10) / 10
      : 0,
    groups: monthActive.size >= MIN_GROUP ? countGroups(groupIds) : { positive: 0, neutral: 0, negative: 0 },
    habits: {
      total: habitRows.length,
      withStreak3: logsPer.filter((d) => streakOf(d) >= 3).length,
      avgLogsPerHabit: habitRows.length ? Math.round((logsPer.reduce((s, d) => s + d.length, 0) / habitRows.length) * 10) / 10 : 0,
    },
    reflections: reflections.count ?? 0,
    alerts: {
      total: al.length,
      urgent: al.filter((a) => a.severity === "urgent").length,
      resolved: al.filter((a) => a.status === "resolved").length,
      medianHandleHours: handleHours.length ? Math.round(handleHours[Math.floor(handleHours.length / 2)] * 10) / 10 : null,
    },
    surveys: { count: surveys.count ?? 0, responses: responses.count ?? 0 },
    feedback: {
      ups: fb.filter((f) => f.rating === 1).length,
      downs: fb.filter((f) => f.rating === -1).length,
      reasons: [...reasonTally].sort((a, b) => b[1] - a[1]).map(([reason, count]) => ({ reason, count })),
    },
  };
}

/**
 * Mục "Vòng hỗ trợ" trong Kết quả nghiên cứu. Mặc định không tính học sinh lớp thử.
 * `ready = false` khi chưa chạy migration 0010.
 */
export async function supportLoopMetrics(
  includeTest = false,
): Promise<{ ready: boolean; testStudents: number; stats: SupportLoopStats }> {
  const [testClasses, worries, checks, activity, content] = await Promise.all([
    db().from("classes").select("id").eq("is_test", true),
    db().from("worries").select("id, user_id, topic, level_start"),
    db().from("worry_checks").select("worry_id, level, feeling, created_at"),
    db().from("support_activity").select("user_id, kind, ref").in("kind", ["told", "tiny_action_done"]),
    allContent(),
  ]);
  const classIds = (testClasses.data ?? []).map((c) => c.id as string);
  const testStudents = classIds.length
    ? await db().from("profiles").select("id").eq("role", "student").in("class_id", classIds)
    : { data: [], error: null };
  // không đọc được lớp thử thì không hiện số liệu (tránh lặng lẽ tính cả học sinh lớp thử)
  const ready = !worries.error && !checks.error && !activity.error && !testClasses.error && !testStudents.error;
  if (testClasses.error || testStudents.error) console.error("[F-Mood] Đọc lớp thử lỗi", testClasses.error ?? testStudents.error);
  const testIds = new Set((testStudents.data ?? []).map((p) => p.id as string));
  const counted = (userId: string) => includeTest || !testIds.has(userId);

  const checksBy = new Map<string, { level: number; feeling: Feeling; at: string }[]>();
  for (const c of checks.data ?? []) {
    const list = checksBy.get(c.worry_id) ?? [];
    list.push({ level: c.level, feeling: c.feeling as Feeling, at: c.created_at });
    checksBy.set(c.worry_id, list);
  }
  const rows = (activity.data ?? []).filter((a) => counted(a.user_id));

  return {
    ready,
    testStudents: testIds.size,
    stats: supportLoopStats({
      worries: (worries.data ?? [])
        .filter((w) => counted(w.user_id))
        .map((w) => ({ id: w.id, userId: w.user_id, topic: w.topic, levelStart: w.level_start, checks: checksBy.get(w.id) ?? [] })),
      told: rows.filter((r) => r.kind === "told").map((r) => ({ userId: r.user_id, who: r.ref ?? "other" })),
      tinyActions: rows.filter((r) => r.kind === "tiny_action_done").map((r) => ({ userId: r.user_id })),
      topicLabels: Object.fromEntries(
        content.items.filter((i) => i.kind === "topic" && i.topic).map((i) => [i.topic as string, String(i.data.label)]),
      ),
    }),
  };
}
