import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/auth";
import { assignedForm } from "@/lib/bai-do";
import type { Survey } from "@/lib/surveys";

const BASE_COLUMNS = "id, title, description, questions, class_ids, status, created_at";
const COLUMNS = `${BASE_COLUMNS}, kind, test_round, test_form`;
// chưa chạy migration 0018 (chưa có cột kind, meta…)
const MISSING = new Set(["42P01", "42703", "PGRST204", "PGRST205"]);

type Query = PromiseLike<{ data: unknown; error: { code: string } | null }>;

/**
 * Đọc phiếu kèm loại phiếu (khảo sát / bài đo). Chưa chạy migration 0018 thì đọc như cũ:
 * mọi phiếu là phiếu thường, chưa có bài đo nào.
 */
export async function readSurveys(build: (columns: string) => Query): Promise<Survey[]> {
  const res = await build(COLUMNS);
  if (res.error && MISSING.has(res.error.code)) {
    const old = await build(BASE_COLUMNS);
    return ((old.data ?? []) as Survey[]).map((s) => ({ ...s, kind: "survey" as const }));
  }
  const rows = res.data === null ? [] : Array.isArray(res.data) ? res.data : [res.data];
  return (rows as Survey[]).map((s) => ({ ...s, kind: s.kind ?? "survey" }));
}

/** Học sinh này có được thấy phiếu này không: đúng lớp; bài đo thì chỉ đúng đề được giao ở lần đo đó. */
export function surveyVisibleTo(profile: Pick<Profile, "id" | "class_id">, s: Survey): boolean {
  if (s.class_ids?.length && (profile.class_id === null || !s.class_ids.includes(profile.class_id))) return false;
  if (s.kind === "test") {
    if (s.test_round !== 1 && s.test_round !== 2) return false;
    return s.test_form === assignedForm(profile.id, s.test_round);
  }
  return true;
}

/** Phiếu đang mở cho lớp của học sinh mà học sinh chưa trả lời (bài đo: chỉ đề được giao). */
export async function pendingSurveys(profile: Profile): Promise<Survey[]> {
  const admin = createAdminClient();
  const [surveys, { data: done }] = await Promise.all([
    readSurveys((cols) => admin.from("surveys").select(cols).eq("status", "open").order("created_at", { ascending: false })),
    admin.from("survey_responses").select("survey_id").eq("user_id", profile.id),
  ]);
  const answered = new Set((done ?? []).map((d) => d.survey_id));
  return surveys.filter((s) => !answered.has(s.id) && surveyVisibleTo(profile, s));
}

/** Một phiếu học sinh được phép trả lời (đang mở, đúng lớp, bài đo thì đúng đề được giao). */
export async function surveyForStudent(profile: Profile, surveyId: string): Promise<{ survey: Survey; answered: boolean } | null> {
  const admin = createAdminClient();
  const [survey] = await readSurveys((cols) => admin.from("surveys").select(cols).eq("id", surveyId).maybeSingle());
  if (!survey || survey.status !== "open" || !surveyVisibleTo(profile, survey)) return null;
  const { data: resp } = await admin
    .from("survey_responses")
    .select("id")
    .eq("survey_id", surveyId)
    .eq("user_id", profile.id)
    .maybeSingle();
  return { survey, answered: Boolean(resp) };
}

/** Loại phiếu (để trang thầy cô giấu câu tự trả lời của bài đo). Chưa có cột kind thì là phiếu thường. */
export async function surveyKind(id: string): Promise<"survey" | "test"> {
  const { data, error } = await createAdminClient().from("surveys").select("kind").eq("id", id).maybeSingle();
  // lỗi khác (mất kết nối…) thì coi là bài đo: thà giấu nhầm còn hơn lộ bài làm
  if (error) return MISSING.has(error.code) ? "survey" : "test";
  return data?.kind === "test" ? "test" : "survey";
}
