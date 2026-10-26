import "server-only";
import { addDays, dayKey, startOfDayIso } from "@/lib/dates";
import { REPLY_RUN_PREFIX } from "@/lib/eval/reply-checks";
import { TOPIC_CASES } from "@/lib/eval/topic-cases";
import { createAdminClient } from "@/lib/supabase/admin";
import { dataScope, type DataScope } from "@/lib/demo/server";
import { allContent } from "@/lib/support-content-server";
import { guessTopic } from "@/lib/topic-guess";
import {
  falseAlarms,
  replyQuality,
  retentionWeek1,
  safetyCatch,
  teacherResponse,
  topicGuessing,
  worriesLighter,
  type Metric,
} from "./metrics";

// SỐ LIỆU THẬT CHO TRANG KẾT QUẢ (chỉ số 1–7). Chỉ số 8–10 tính từ file khảo sát ngay trên trình duyệt.
// Luôn bỏ học sinh lớp thử (classes.is_test) và mọi cảnh báo của lớp thử.
// Lớp mẫu của chế độ trình diễn: chỉ được tính khi đang trình diễn (khi đó CHỈ tính lớp mẫu), xem lib/demo/server.ts.

const db = () => createAdminClient();

const PAGE = 1000;

/** Đọc hết mọi dòng (Supabase trả tối đa 1000 dòng mỗi lần; thiếu dòng là sai số liệu). */
async function readAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { code?: string } | null }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) return { data: rows.length ? rows : null, error };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return { data: rows, error: null };
  }
}

export type EffectData = {
  metrics: Metric[];
  excludedTestStudents: number;
  runs: { risk: string | null; reply: string | null };
  generatedAt: string;
};

async function testStudentIds(scope: DataScope): Promise<{ users: Set<string>; classes: Set<string> }> {
  const demoClasses = new Set(scope.registry?.classIds ?? []);
  const { data: classes } = await db().from("classes").select("id").eq("is_test", true);
  const classIds = (classes ?? []).map((c) => c.id as string).filter((id) => !demoClasses.has(id));
  const { data: students } = classIds.length ? await db().from("profiles").select("id").in("class_id", classIds) : { data: [] };
  return { users: new Set((students ?? []).map((s) => s.id as string)), classes: new Set(classIds) };
}

/** Tài khoản không được tính: học sinh lớp thử, và tài khoản nằm ngoài phạm vi (mẫu khi bình thường, thật khi trình diễn). */
function skipper(test: Set<string>, scope: DataScope) {
  return { has: (id: string) => test.has(id) || !scope.userOk(id) };
}

async function latestRuns() {
  const { data } = await db().from("eval_runs").select("model, total, passed, results, created_at").order("created_at", { ascending: false }).limit(30);
  const runs = data ?? [];
  const isReply = (m: string | null) => (m ?? "").startsWith(REPLY_RUN_PREFIX);
  return { risk: runs.find((r) => !isReply(r.model)) ?? null, reply: runs.find((r) => isReply(r.model)) ?? null };
}

async function alertTimes(testClasses: Set<string>, scope: DataScope) {
  const cols = "severity, status, class_id, created_at, handled_at";
  const read = (c: string) => readAll((a, b) => db().from("alerts").select(c).eq("severity", "urgent").order("created_at").range(a, b));
  const withFirst = await read(`${cols}, first_handled_at`);
  const rows = ((withFirst.error ? (await read(cols)).data : withFirst.data) ?? []) as unknown[];
  return (rows as unknown as { severity: "urgent"; status: string; class_id: string | null; created_at: string; handled_at: string | null; first_handled_at?: string | null }[])
    .filter((a) => (!a.class_id || !testClasses.has(a.class_id)) && scope.classOk(a.class_id))
    .map((a) => ({
      severity: a.severity,
      created_at: a.created_at,
      // cảnh báo trước 0013 chưa có "lúc nhận lần đầu": dùng tạm lúc cập nhật cuối (có thể muộn hơn thật)
      first_handled_at: a.first_handled_at ?? (a.status !== "new" ? a.handled_at : null),
      estimated: !a.first_handled_at && a.status !== "new",
    }));
}

async function activityDays(skip: { has: (id: string) => boolean }, today: string) {
  const since = startOfDayIso(addDays(today, -120));
  const [checkins, messages] = await Promise.all([
    readAll((a, b) => db().from("checkins").select("user_id, created_at").gte("created_at", since).order("created_at").range(a, b)),
    readAll((a, b) =>
      db().from("messages").select("created_at, conversations!inner(user_id)").eq("role", "user").gte("created_at", since).order("created_at").range(a, b),
    ),
  ]);
  const days = new Map<string, Set<string>>();
  const add = (user: string, iso: string) => {
    if (skip.has(user)) return;
    days.set(user, (days.get(user) ?? new Set()).add(dayKey(iso)));
  };
  for (const c of checkins.data ?? []) add(c.user_id as string, c.created_at as string);
  for (const m of messages.data ?? []) add((m.conversations as unknown as { user_id: string }).user_id, m.created_at as string);
  return new Map([...days].map(([u, s]) => [u, [...s]]));
}

async function worryLevels(skip: { has: (id: string) => boolean }) {
  const [{ data: worries }, { data: checks }] = await Promise.all([
    readAll((a, b) => db().from("worries").select("id, user_id, level_start").order("created_at").range(a, b)),
    readAll((a, b) => db().from("worry_checks").select("worry_id, level, created_at").order("created_at").range(a, b)),
  ]);
  const last = new Map<string, number>();
  for (const c of checks ?? []) last.set(c.worry_id as string, c.level as number); // sắp theo thời gian → giữ lần cuối
  return (worries ?? [])
    .filter((w) => !skip.has(w.user_id as string))
    .map((w) => ({ userId: w.user_id as string, levelStart: w.level_start as number, lastLevel: last.get(w.id as string) ?? null }));
}

async function topicData(skip: { has: (id: string) => boolean }) {
  const [content, { data: answers }] = await Promise.all([
    allContent(),
    readAll((a, b) => db().from("support_activity").select("user_id, kind").in("kind", ["topic_guess_yes", "topic_guess_no"]).order("created_at").range(a, b)),
  ]);
  // cụm từ nhận diện học sinh lớp thật đang dùng (chủ đề đã bật)
  const topics = content.items
    .filter((i) => i.kind === "topic" && i.topic && i.status === "on")
    .map((i) => ({ key: i.topic as string, triggers: (i.data.triggers as string[]) ?? [] }));
  const testSet = TOPIC_CASES.map((c) => ({ expected: c.expected, got: topics.length ? guessTopic(c.text, topics) : null }));
  const live = (answers ?? []).filter((a) => !skip.has(a.user_id as string));
  return {
    testSet: topics.length ? testSet : [],
    live: {
      students: new Set(live.map((a) => a.user_id)).size,
      yes: live.filter((a) => a.kind === "topic_guess_yes").length,
      no: live.filter((a) => a.kind === "topic_guess_no").length,
    },
  };
}

export async function effectData(): Promise<EffectData> {
  const today = dayKey();
  const scope = await dataScope();
  const test = await testStudentIds(scope);
  const skip = skipper(test.users, scope);
  const [runs, alerts, days, worries, topic] = await Promise.all([
    latestRuns(),
    alertTimes(test.classes, scope),
    activityDays(skip, today),
    worryLevels(skip),
    topicData(skip),
  ]);
  const riskCases = runs.risk ? ((runs.risk.results ?? []) as { expected: string; got: string }[]) : null;
  const risk = riskCases ? { cases: riskCases } : null;
  return {
    metrics: [
      safetyCatch(risk),
      falseAlarms(risk),
      topicGuessing(topic.testSet, topic.live),
      replyQuality(runs.reply ? { total: runs.reply.total as number, passed: runs.reply.passed as number } : null),
      teacherResponse(alerts, Date.now()),
      retentionWeek1(days, today),
      worriesLighter(worries),
    ],
    excludedTestStudents: test.users.size,
    runs: { risk: (runs.risk?.created_at as string | undefined) ?? null, reply: (runs.reply?.created_at as string | undefined) ?? null },
    generatedAt: new Date().toISOString(),
  };
}
