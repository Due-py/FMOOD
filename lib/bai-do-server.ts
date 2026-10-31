import "server-only";
import { createHash } from "node:crypto";
import { cache } from "react";
import type { Profile } from "@/lib/auth";
import { CELL_IDS, isCellValue, TEST_IDS, TEST_TEXT_QUESTIONS, type Cells, type RaterScore, type TestMeta } from "@/lib/bai-do";
import { createAdminClient } from "@/lib/supabase/admin";
import { readSurveys, surveyVisibleTo } from "@/lib/surveys-server";
import type { Survey, SurveyAnswers } from "@/lib/surveys";

// BÀI ĐO VÀ CHẤM MÙ, PHẦN MÁY CHỦ (kế hoạch Demo 3, mục 6.2, 6.7).
// Bảng test_* không có policy RLS: chỉ đọc ở đây bằng quyền máy chủ, sau khi tự kiểm tra quyền.
// Quy tắc riêng tư: admin (thành viên nhóm, học cùng lớp) KHÔNG BAO GIỜ nhận được chữ học sinh viết trong bài đo;
// người chấm chỉ nhận mã chấm và 9 câu trả lời, không có tên, lớp, lần, đề, ngày làm.

export const MISSING = new Set(["42P01", "42703", "PGRST204", "PGRST205"]);
/** Số bài người chấm 2 chấm lại. */
export const SECOND_RATER_SAMPLE = 30;

/** Lớp này có đang ở chế độ "chỉ làm bài đo" không (chưa chạy 0018 thì không). */
export const isTestOnlyClass = cache(async (classId: string | null): Promise<boolean> => {
  if (!classId) return false;
  const { data, error } = await createAdminClient().from("classes").select("test_only").eq("id", classId).maybeSingle();
  if (error && !MISSING.has(error.code)) console.error("[F-Mood] Đọc chế độ chỉ làm bài đo lỗi", error);
  return data?.test_only === true;
});

// ───────────────────────── Học sinh ─────────────────────────

/** Bài đo đang mở cho học sinh này (chỉ đúng đề được giao ở mỗi lần đo), kèm đã nộp hay chưa. */
export async function testsForStudent(profile: Profile): Promise<{ survey: Survey; answered: boolean }[]> {
  const admin = createAdminClient();
  const surveys = (
    await readSurveys((cols) => admin.from("surveys").select(cols).eq("status", "open").eq("kind", "test").order("test_round"))
  ).filter((s) => s.kind === "test" && surveyVisibleTo(profile, s));
  if (!surveys.length) return [];
  const { data: done } = await admin
    .from("survey_responses")
    .select("survey_id")
    .eq("user_id", profile.id)
    .in(
      "survey_id",
      surveys.map((s) => s.id),
    );
  const answered = new Set((done ?? []).map((d) => d.survey_id as string));
  return surveys.map((survey) => ({ survey, answered: answered.has(survey.id) }));
}

// ───────────────────────── Người chấm ─────────────────────────

export type GradingLock = { opened_at: string | null; locked_at: string | null; locked_by_name: string | null };

export async function gradingLock(): Promise<{ ready: boolean; lock: GradingLock }> {
  const { data, error } = await createAdminClient().from("test_locks").select("opened_at, locked_at, locked_by_name").eq("id", 1).maybeSingle();
  if (error) return { ready: !MISSING.has(error.code), lock: { opened_at: null, locked_at: null, locked_by_name: null } };
  return { ready: true, lock: (data as GradingLock | null) ?? { opened_at: null, locked_at: null, locked_by_name: null } };
}

/** Người này chấm ở vị trí nào (1 hoặc 2); không được giao thì null. Admin không bao giờ là người chấm. */
export async function raterSlot(profile: Profile): Promise<1 | 2 | null> {
  if (profile.role === "admin" || profile.role === "student") return null;
  const { data } = await createAdminClient().from("test_raters").select("slot").eq("user_id", profile.id).maybeSingle();
  return data?.slot === 1 || data?.slot === 2 ? data.slot : null;
}

export type QueueItem = { code: string; done: boolean; started: boolean };

/** Danh sách mã bài người chấm này được chấm (người chấm 1: mọi bài; người chấm 2: 30 bài), theo thứ tự đã xáo. */
export async function raterQueue(profile: Profile, slot: 1 | 2): Promise<QueueItem[]> {
  const admin = createAdminClient();
  let query = admin.from("test_codes").select("code, response_id").order("code");
  if (slot === 2) query = query.eq("in_sample", true);
  const [{ data: codes }, { data: scores }] = await Promise.all([
    query,
    admin.from("test_scores").select("response_id, cells").eq("rater_id", profile.id),
  ]);
  const byResponse = new Map((scores ?? []).map((s) => [s.response_id as string, s.cells as Cells]));
  return (codes ?? []).map((c) => {
    const cells = byResponse.get(c.response_id as string);
    return {
      code: c.code as string,
      started: Boolean(cells),
      done: Boolean(cells) && CELL_IDS.every((id) => isCellValue(cells?.[id])),
    };
  });
}

export type { RaterScore } from "@/lib/bai-do";

/**
 * Một bài cho người chấm: CHỈ mã chấm và 9 câu trả lời (theo câu hỏi chung của cả hai đề).
 * Không trả về mã bài làm, lớp, lần, đề, ngày làm hay tài khoản.
 */
export async function responseForRater(
  profile: Profile,
  slot: 1 | 2,
  code: string,
): Promise<{ code: string; answers: { id: string; answer: string }[]; score: RaterScore | null } | null> {
  const admin = createAdminClient();
  const { data: row } = await admin.from("test_codes").select("response_id, in_sample").eq("code", code).maybeSingle();
  if (!row || (slot === 2 && !row.in_sample)) return null;
  const [{ data: resp }, { data: score }] = await Promise.all([
    admin.from("survey_responses").select("answers").eq("id", row.response_id).maybeSingle(),
    admin
      .from("test_scores")
      .select("cells, guess_class, guess_round, note, referred")
      .eq("response_id", row.response_id)
      .eq("rater_id", profile.id)
      .maybeSingle(),
  ]);
  if (!resp) return null;
  const answers = (resp.answers ?? {}) as SurveyAnswers;
  return {
    code,
    answers: TEST_TEXT_QUESTIONS.map((q) => ({ id: q.id, answer: typeof answers[q.id] === "string" ? (answers[q.id] as string) : "" })),
    score: (score as RaterScore | null) ?? null,
  };
}

/** Mã bài làm của một mã chấm, nếu người chấm này được chấm bài đó. Chỉ dùng phía máy chủ. */
export async function responseIdForRater(slot: 1 | 2, code: string): Promise<string | null> {
  const { data } = await createAdminClient().from("test_codes").select("response_id, in_sample").eq("code", code).maybeSingle();
  if (!data || (slot === 2 && !data.in_sample)) return null;
  return data.response_id as string;
}

// ───────────────────────── Admin (chỉ số đếm, không có bài làm) ─────────────────────────

export type StaffOption = { id: string; nickname: string; role: string };

export type GradingOverview = {
  ready: boolean;
  lock: GradingLock;
  raters: { slot: 1 | 2; user_id: string; nickname: string }[];
  candidates: StaffOption[];
  /** số bài theo từng phiếu bài đo (chỉ số đếm) */
  perSurvey: { title: string; status: string; responses: number }[];
  responses: number;
  coded: number;
  sample: number;
  progress: { slot: 1 | 2; done: number; total: number }[];
  referred: number;
};

/** Tiến độ chấm cho trang admin: chỉ có số đếm, không có chữ học sinh viết, không có ghép mã. */
export async function gradingOverview(): Promise<GradingOverview> {
  const admin = createAdminClient();
  const { ready, lock } = await gradingLock();
  const empty: GradingOverview = { ready, lock, raters: [], candidates: [], perSurvey: [], responses: 0, coded: 0, sample: 0, progress: [], referred: 0 };
  if (!ready) return empty;

  const tests = await readSurveys((cols) => admin.from("surveys").select(cols).eq("kind", "test").order("title"));
  const testIds = tests.map((s) => s.id);
  const [{ data: raters }, { data: staff }, { data: responses }, { data: codes }, { data: scores }] = await Promise.all([
    admin.from("test_raters").select("slot, user_id, profiles(nickname)"),
    admin.from("profiles").select("id, nickname, role").in("role", ["teacher", "counselor"]).is("locked_at", null).order("nickname"),
    testIds.length ? admin.from("survey_responses").select("survey_id").in("survey_id", testIds) : Promise.resolve({ data: [] as { survey_id: string }[] }),
    admin.from("test_codes").select("in_sample"),
    admin.from("test_scores").select("slot, cells, referred"),
  ]);

  const doneOf = (slot: 1 | 2) =>
    (scores ?? []).filter((s) => s.slot === slot && CELL_IDS.every((c) => isCellValue((s.cells as Cells)?.[c]))).length;
  const coded = (codes ?? []).length;
  const sample = (codes ?? []).filter((c) => c.in_sample).length;
  return {
    ready,
    lock,
    raters: (raters ?? []).map((r) => ({
      slot: r.slot as 1 | 2,
      user_id: r.user_id as string,
      nickname: (r.profiles as unknown as { nickname: string } | null)?.nickname ?? "?",
    })),
    candidates: (staff ?? []) as StaffOption[],
    perSurvey: tests.map((s) => ({
      title: s.title,
      status: s.status,
      responses: (responses ?? []).filter((r) => r.survey_id === s.id).length,
    })),
    responses: (responses ?? []).length,
    coded,
    sample,
    progress: [
      { slot: 1, done: doneOf(1), total: coded },
      { slot: 2, done: doneOf(2), total: sample },
    ],
    referred: (scores ?? []).filter((s) => s.referred).length,
  };
}

/** Mã học sinh ẩn danh, ổn định (để script ghép lần 1 – lần 2 mà không cần tên). */
export function studentKey(userId: string): string {
  return `HS-${createHash("sha256").update(userId).digest("hex").slice(0, 8)}`;
}

/** Bảng điểm theo đúng thứ tự cột của phieu-cham-bai-tinh-huong.csv (không có thông tin học sinh). */
export async function scoreRows(): Promise<{ code: string; slot: 1 | 2; cells: Cells; guess_class: string | null; guess_round: string | null; note: string | null; referred: boolean }[]> {
  const admin = createAdminClient();
  const [{ data: codes }, { data: scores }] = await Promise.all([
    admin.from("test_codes").select("response_id, code"),
    admin.from("test_scores").select("response_id, slot, cells, guess_class, guess_round, note, referred"),
  ]);
  const codeOf = new Map((codes ?? []).map((c) => [c.response_id as string, c.code as string]));
  return (scores ?? [])
    .filter((s) => codeOf.has(s.response_id as string))
    .map((s) => ({
      code: codeOf.get(s.response_id as string)!,
      slot: s.slot as 1 | 2,
      cells: (s.cells ?? {}) as Cells,
      guess_class: s.guess_class as string | null,
      guess_round: s.guess_round as string | null,
      note: s.note as string | null,
      referred: Boolean(s.referred),
    }))
    .sort((a, b) => a.code.localeCompare(b.code) || a.slot - b.slot);
}

export type MappingRow = {
  code: string;
  student: string;
  account: string;
  className: string;
  round: number | null;
  form: string | null;
  readBefore: string;
  aiUse: string;
  durationS: number | null;
  pasteBlocked: number;
  submittedAt: string;
  referred: boolean;
};

/**
 * Bảng ghép mã chấm với tài khoản, lớp, lần, đề. CHỈ gọi sau khi đã khóa điểm (trang kiểm tra trước).
 * Không có 9 câu tự trả lời, không có TĐ, HV; chỉ câu "đã đọc đề", câu dùng AI và thông tin thêm (để loại bài khi tính).
 */
export async function mappingRows(): Promise<MappingRow[]> {
  const { lock } = await gradingLock();
  if (!lock.locked_at) return [];
  const admin = createAdminClient();
  const [{ data: codes }, tests, { data: scores }] = await Promise.all([
    admin.from("test_codes").select("response_id, code").order("code"),
    readSurveys((cols) => admin.from("surveys").select(cols).eq("kind", "test")),
    admin.from("test_scores").select("response_id, referred").eq("referred", true),
  ]);
  const ids = (codes ?? []).map((c) => c.response_id as string);
  if (!ids.length) return [];
  const { data: responses } = await admin
    .from("survey_responses")
    .select("id, survey_id, user_id, answers, meta, created_at, classes(name), profiles(nickname)")
    .in("id", ids);
  const byId = new Map((responses ?? []).map((r) => [r.id as string, r]));
  const survey = new Map(tests.map((s) => [s.id, s]));
  const referred = new Set((scores ?? []).map((s) => s.response_id as string));
  return (codes ?? []).flatMap((c) => {
    const r = byId.get(c.response_id as string);
    if (!r) return [];
    const s = survey.get(r.survey_id as string);
    const a = (r.answers ?? {}) as SurveyAnswers;
    const meta = (r.meta ?? {}) as Partial<TestMeta>;
    const pick = (id: string) => (a[id] === undefined ? "" : String(a[id]));
    return [
      {
        code: c.code as string,
        student: r.user_id ? studentKey(r.user_id as string) : "",
        account: (r.profiles as unknown as { nickname: string } | null)?.nickname ?? "",
        className: (r.classes as unknown as { name: string } | null)?.name ?? "",
        round: s?.test_round ?? null,
        form: s?.test_form ?? null,
        readBefore: pick(TEST_IDS.readBefore),
        aiUse: pick(TEST_IDS.aiUse),
        durationS: meta.duration_s ?? null,
        pasteBlocked: meta.pasted_blocked ?? 0,
        submittedAt: r.created_at as string,
        referred: referred.has(c.response_id as string),
      },
    ];
  });
}
