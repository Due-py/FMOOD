"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePage } from "@/lib/permissions";
import { blockInDemo } from "@/lib/demo/guard";
import { audit } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { lessonCaselSchema } from "@/lib/lesson-casel";

// DUYỆT BÀI THƯ VIỆN: admin và phòng tham vấn đánh dấu đã duyệt / bỏ duyệt, ghi nguồn của bài.

type Result = { ok: true } | { ok: false; error: string };
const FAILED = { ok: false as const, error: "Chưa lưu được. Thử lại nhé." };
const NOT_READY = { ok: false as const, error: "Cần chạy file supabase/migrations/0015_duyet_bai_thu_vien.sql trước." };
const PATH = "/staff/content/duyet-bai";

function done() {
  revalidatePath(PATH);
  revalidatePath("/library", "layout");
}

/** Đánh dấu đã duyệt (ghi người duyệt và ngày) hoặc bỏ duyệt. */
export async function setLessonReviewed(id: string, reviewed: boolean): Promise<Result> {
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const profile = await requirePage("/staff/content/duyet-bai");
  if (!z.uuid().safeParse(id).success) return FAILED;
  const patch = reviewed
    ? { reviewed_by: profile.id, reviewed_by_name: profile.full_name ?? profile.nickname, reviewed_at: new Date().toISOString() }
    : { reviewed_by: null, reviewed_by_name: null, reviewed_at: null };
  const { data, error } = await createAdminClient().from("lessons").update(patch).eq("id", id).select("title");
  if (error) return error.code === "42703" || error.code === "PGRST204" ? NOT_READY : FAILED;
  if (!data?.length) return FAILED;
  await audit(profile, reviewed ? "Duyệt bài thư viện" : "Bỏ duyệt bài thư viện", data[0].title as string);
  done();
  return { ok: true };
}

/**
 * Duyệt một lần mọi bài đã đăng, đã gắn năng lực CASEL mà người này chưa duyệt (kể cả bài người khác đã duyệt: ghi lại tên
 * người này). Người bấm xác nhận đã đọc các bài đó; tên và ngày của họ hiện ở cuối từng bài. Ghi một dòng nhật ký quản trị.
 */
export async function reviewAllAssigned(): Promise<Result & { count?: number }> {
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const profile = await requirePage("/staff/content/duyet-bai");
  const { data, error } = await createAdminClient()
    .from("lessons")
    .update({ reviewed_by: profile.id, reviewed_by_name: profile.full_name ?? profile.nickname, reviewed_at: new Date().toISOString() })
    .eq("published", true)
    .not("casel_primary", "is", null)
    .or(`reviewed_by.is.null,reviewed_by.neq.${profile.id}`)
    .select("id");
  if (error) return error.code === "42703" || error.code === "PGRST204" ? NOT_READY : FAILED;
  await audit(profile, "Duyệt bài thư viện", `${data?.length ?? 0} bài đã gắn CASEL, duyệt một lần`);
  done();
  return { ok: true, count: data?.length ?? 0 };
}

const sourceSchema = z.string().trim().max(300, "Nguồn tối đa 300 ký tự");

/** Ghi nguồn của bài (sách, tác giả, nhóm tự soạn...). Đổi nguồn không làm mất trạng thái duyệt. */
export async function setLessonSource(id: string, source: string): Promise<Result> {
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const profile = await requirePage("/staff/content/duyet-bai");
  const parsed = sourceSchema.safeParse(source);
  if (!z.uuid().safeParse(id).success || !parsed.success) return { ok: false, error: parsed.success ? FAILED.error : parsed.error.issues[0].message };
  const { data, error } = await createAdminClient().from("lessons").update({ source: parsed.data }).eq("id", id).select("title");
  if (error || !data?.length) return FAILED;
  await audit(profile, "Sửa nguồn bài thư viện", data[0].title as string);
  done();
  return { ok: true };
}

/**
 * Gắn khung CASEL cho bài đọc (0026): năng lực chính, liên quan, mã kỹ năng thành phần 2020, kỹ năng có bài luyện, một mục tiêu.
 * Chỉ người có quyền trang Duyệt bài, kiểm tra ở máy chủ; ghi nhật ký quản trị. Không đổi trạng thái duyệt.
 */
export async function setLessonSel(id: string, raw: unknown): Promise<Result> {
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const profile = await requirePage("/staff/content/duyet-bai");
  if (!z.uuid().safeParse(id).success) return FAILED;
  const parsed = lessonCaselSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { data, error } = await createAdminClient().from("lessons").update(parsed.data).eq("id", id).select("title");
  if (error) return error.code === "42703" || error.code === "PGRST204" ? { ok: false, error: "Cần chạy file supabase/migrations/0026_casel_ky_nang.sql trước." } : FAILED;
  if (!data?.length) return FAILED;
  await audit(profile, "Gắn khung CASEL cho bài thư viện", data[0].title as string);
  done();
  return { ok: true };
}
