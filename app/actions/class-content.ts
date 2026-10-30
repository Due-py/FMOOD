"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { CLEAR_REVIEW } from "@/lib/lesson-review";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { canEditOwned, classLessonById } from "@/lib/class-content";
import { LESSON_EMOJIS } from "@/lib/class-tools";
import { exerciseSchema } from "@/lib/exercises";
import { audit } from "@/lib/settings";
import { canSeeClass } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";

// BÀI HỌC GIÁO VIÊN SOẠN CHO LỚP MÌNH. Học sinh chỉ thấy bài của lớp mình (chính sách đọc ở 0012).
// Mỗi thao tác có Hoàn tác: ẩn ↔ đăng, xóa → khôi phục (chỉ xóa được bài chưa có ai làm).

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const FAILED = { ok: false as const, error: "Chưa lưu được. Thử lại nhé." };
const FORBIDDEN = { ok: false as const, error: "Thầy cô chỉ sửa được bài của mình, cho lớp mình chủ nhiệm." };

const classLessonSchema = z.object({
  classId: z.uuid("Chọn lớp nhận bài"),
  title: z.string().trim().min(3, "Đặt tên bài nhé").max(120),
  summary: z.string().trim().max(300).default(""),
  emoji: z.string().refine((s) => LESSON_EMOJIS.includes(s), "Chọn một biểu tượng"),
  body: z.string().trim().min(20, "Nội dung bài còn ngắn quá").max(20000, "Bài dài quá (tối đa 20.000 ký tự)"),
  exercises: z.array(exerciseSchema).max(5).default([]),
  published: z.boolean(),
});

function refresh() {
  revalidatePath("/staff", "layout");
  revalidatePath("/library", "layout");
}

export async function saveClassLesson(id: string | null, input: unknown): Promise<Result<{ id: string }>> {
  const actor = await requireStaff(["teacher", "admin"]);
  const parsed = classLessonSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu chưa hợp lệ." };
  const { classId, ...fields } = parsed.data;
  if (!(await canSeeClass(actor, classId))) return FORBIDDEN;

  const db = createAdminClient();
  if (id) {
    if (!z.uuid().safeParse(id).success || !(await classLessonById(actor, id))) return FORBIDDEN;
    const patch = { ...fields, class_id: classId, updated_at: new Date().toISOString() };
    // sửa bài thì bài trở lại "chưa duyệt" (chưa chạy 0015 thì chưa có cột duyệt: lưu như cũ)
    let { error } = await db.from("lessons").update({ ...patch, ...CLEAR_REVIEW }).eq("id", id);
    if (error?.code === "42703" || error?.code === "PGRST204") ({ error } = await db.from("lessons").update(patch).eq("id", id));
    if (error) return FAILED;
    await audit(actor, "Sửa bài cho lớp", fields.title);
    refresh();
    return { ok: true, id };
  }

  const { data: cls } = await db.from("classes").select("grade").eq("id", classId).maybeSingle();
  const { data, error } = await db
    .from("lessons")
    .insert({
      ...fields,
      slug: `lop-${randomBytes(4).toString("hex")}`,
      topic: "Bài của lớp mình",
      grade: cls?.grade ?? null,
      source: `Thầy cô ${actor.nickname} soạn`,
      sort_order: 0,
      class_id: classId,
      author_id: actor.id,
      author_name: actor.nickname,
    })
    .select("id")
    .single();
  if (error) return error.code === "42703" ? { ok: false, error: "Phần này cần chạy cập nhật cơ sở dữ liệu 0012 trước." } : FAILED;
  await audit(actor, "Soạn bài cho lớp", fields.title);
  refresh();
  return { ok: true, id: data.id };
}

/** Đăng cho lớp / ẩn khỏi lớp (Hoàn tác = gọi lại với giá trị ngược). */
export async function setClassLessonPublished(id: string, published: boolean): Promise<Result> {
  const actor = await requireStaff(["teacher", "admin"]);
  if (!z.uuid().safeParse(id).success || !(await classLessonById(actor, id))) return FORBIDDEN;
  const { error } = await createAdminClient().from("lessons").update({ published, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return FAILED;
  refresh();
  return { ok: true };
}

const snapshotSchema = classLessonSchema.extend({
  id: z.uuid(),
  slug: z.string().regex(/^lop-[a-f0-9]{8}$/),
  grade: z.number().int().min(6).max(12).nullable(),
});
export type ClassLessonSnapshot = z.infer<typeof snapshotSchema>;

/** Xóa bài chưa có học sinh nào làm. Trả về bản sao để Hoàn tác. */
export async function deleteClassLesson(id: string): Promise<Result<{ snapshot: ClassLessonSnapshot }>> {
  const actor = await requireStaff(["teacher", "admin"]);
  if (!z.uuid().safeParse(id).success) return FORBIDDEN;
  const lesson = await classLessonById(actor, id);
  if (!lesson) return FORBIDDEN;
  if (lesson.responses > 0) return { ok: false, error: "Bài này đã có học sinh làm, nên chỉ ẩn được để giữ bài làm của các em." };
  const { error } = await createAdminClient().from("lessons").delete().eq("id", id);
  if (error) return FAILED;
  await audit(actor, "Xóa bài của lớp", lesson.title);
  refresh();
  return {
    ok: true,
    snapshot: {
      id: lesson.id,
      slug: lesson.slug,
      grade: lesson.grade,
      classId: lesson.class_id,
      title: lesson.title,
      summary: lesson.summary,
      emoji: lesson.emoji,
      body: lesson.body,
      exercises: lesson.exercises,
      published: lesson.published,
    },
  };
}

export async function restoreClassLesson(snapshot: ClassLessonSnapshot): Promise<Result> {
  const actor = await requireStaff(["teacher", "admin"]);
  const parsed = snapshotSchema.safeParse(snapshot);
  if (!parsed.success) return FAILED;
  const { classId, ...s } = parsed.data;
  if (!(await canEditOwned(actor, { author_id: actor.id, class_ids: [classId] }))) return FORBIDDEN;
  const { error } = await createAdminClient()
    .from("lessons")
    .insert({
      ...s,
      class_id: classId,
      topic: "Bài của lớp mình",
      source: `Thầy cô ${actor.nickname} soạn`,
      sort_order: 0,
      author_id: actor.id,
      author_name: actor.nickname,
    });
  if (error) return FAILED;
  await audit(actor, "Khôi phục bài của lớp", s.title);
  refresh();
  return { ok: true };
}
