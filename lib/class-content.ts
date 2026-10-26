import "server-only";
import type { Profile } from "@/lib/auth";
import { tableMissing } from "@/lib/help-requests";
import { LESSON_COLUMNS, type Lesson } from "@/lib/lessons";
import { dataScope } from "@/lib/demo/server";
import { visibleClassIds } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Survey } from "@/lib/surveys";

// BÀI HỌC VÀ PHIẾU HỎI CỦA TỪNG GIÁO VIÊN (cột class_id / author_id, migration 0012).
// Giáo viên chỉ thấy và sửa bài / phiếu của chính mình; admin thấy tất cả.

export type ClassLesson = Lesson & { class_id: string; class_name: string | null; author_id: string | null; author_name: string | null; responses: number };

const CLASS_LESSON_COLS = `${LESSON_COLUMNS}, class_id, author_id, author_name, updated_at, classes(name)`;

function toClassLesson(r: Record<string, unknown>, responses = 0): ClassLesson {
  const { classes, ...rest } = r;
  return { ...(rest as Omit<ClassLesson, "class_name" | "responses">), class_name: (classes as { name: string } | null)?.name ?? null, responses };
}

/** Người này được sửa bài / phiếu này không: admin luôn được, giáo viên chỉ của mình và lớp mình. */
export async function canEditOwned(profile: Profile, row: { author_id: string | null; class_ids: string[] }): Promise<boolean> {
  if (profile.role === "admin") return true;
  if (profile.role !== "teacher" || row.author_id !== profile.id) return false;
  const mine = await visibleClassIds(profile);
  return row.class_ids.length > 0 && row.class_ids.every((id) => mine?.includes(id));
}

/** Bài soạn cho lớp: giáo viên thấy bài của mình, admin thấy mọi bài của lớp. */
export async function listClassLessons(profile: Profile): Promise<{ ready: boolean; items: ClassLesson[] }> {
  const db = createAdminClient();
  let query = db.from("lessons").select(CLASS_LESSON_COLS).not("class_id", "is", null).order("updated_at", { ascending: false });
  if (profile.role !== "admin") query = query.eq("author_id", profile.id);
  const { data, error } = await query;
  if (error) return { ready: !tableMissing(error), items: [] };
  // admin: bài của lớp trong phạm vi (trình diễn → lớp mẫu; bình thường → bỏ lớp mẫu). Giáo viên: bài của mình như cũ.
  const scope = await dataScope();
  const rows = (data ?? []).filter((r) => profile.role !== "admin" || scope.classOk(r.class_id as string));
  const { data: answered } = rows.length
    ? await db.from("lesson_responses").select("lesson_id, user_id").in("lesson_id", rows.map((r) => r.id as string))
    : { data: [] };
  const students = new Map<string, Set<string>>();
  for (const a of answered ?? []) students.set(a.lesson_id, (students.get(a.lesson_id) ?? new Set()).add(a.user_id));
  return { ready: true, items: rows.map((r) => toClassLesson(r, students.get(r.id as string)?.size ?? 0)) };
}

export async function classLessonById(profile: Profile, id: string): Promise<ClassLesson | null> {
  const db = createAdminClient();
  const { data } = await db.from("lessons").select(CLASS_LESSON_COLS).eq("id", id).not("class_id", "is", null).maybeSingle();
  if (!data) return null;
  const lesson = toClassLesson(data);
  if (!(await canEditOwned(profile, { author_id: lesson.author_id, class_ids: [lesson.class_id] }))) return null;
  const { count } = await db.from("lesson_responses").select("id", { count: "exact", head: true }).eq("lesson_id", id);
  return { ...lesson, responses: count ?? 0 };
}

// ───────── Phiếu hỏi ─────────

export type OwnedSurvey = Survey & { author_id: string | null; author_name: string | null; responses: number };

const SURVEY_COLS = "id, title, description, questions, class_ids, status, created_at, author_id, author_name";

/** Phiếu người này được xem: admin tất cả, giáo viên chỉ phiếu mình tạo. */
export async function surveysFor(profile: Profile): Promise<{ ready: boolean; items: OwnedSurvey[] }> {
  const db = createAdminClient();
  let query = db.from("surveys").select(SURVEY_COLS).order("created_at", { ascending: false });
  if (profile.role !== "admin") query = query.eq("author_id", profile.id);
  const { data: all, error } = await query;
  if (error) return { ready: !tableMissing(error), items: [] };
  const scope = await dataScope();
  const data = (all ?? []).filter((s) => surveyInScope(scope, s.class_ids as string[] | null));
  const ids = data.map((s) => s.id as string);
  const { data: responses } = ids.length ? await db.from("survey_responses").select("survey_id").in("survey_id", ids) : { data: [] };
  return {
    ready: true,
    items: (data as OwnedSurvey[]).map((s) => ({ ...s, responses: (responses ?? []).filter((r) => r.survey_id === s.id).length })),
  };
}

/** Phiếu gửi cho lớp nào: trình diễn → chỉ phiếu của lớp mẫu; bình thường → không bao giờ là phiếu của lớp mẫu. */
export function surveyInScope(scope: { demo: boolean; classOk: (id: string | null) => boolean }, classIds: string[] | null): boolean {
  if (!classIds || classIds.length === 0) return !scope.demo;
  return classIds.every((id) => scope.classOk(id));
}

/** Phiếu (chưa kèm kết quả) nếu người này được xem / sửa. */
export async function ownedSurvey(profile: Profile, id: string): Promise<OwnedSurvey | null> {
  const { data, error } = await createAdminClient().from("surveys").select(SURVEY_COLS).eq("id", id).maybeSingle();
  if (error || !data) return null;
  const s = data as OwnedSurvey;
  return (await canEditOwned(profile, { author_id: s.author_id, class_ids: s.class_ids ?? [] })) ? { ...s, responses: 0 } : null;
}
