"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile, STAFF_ROLES } from "@/lib/auth";
import { requirePage } from "@/lib/permissions";
import { logActivity } from "@/lib/activity-log";
import { studentDirectory } from "@/lib/activity-data";
import { STUDENT_CODE_RE } from "@/lib/audit-shared";
import { auditLater } from "@/lib/audit";
import { audit, saveSetting } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";

// GHI NHẬT KÝ TỪ TRÌNH DUYỆT (đăng nhập, bấm Cần giúp, mở bài, tải CSV) và thao tác của trang Nhật ký hoạt động.
// Các hàm ghi trả lời ngay rồi mới ghi (after), để không làm chậm việc học sinh / thầy cô đang làm.
// Không bao giờ nhận hay ghi chữ học sinh viết: chỉ loại việc và mã ngắn.

const MISSING = new Set(["42P01", "42703", "PGRST204", "PGRST205"]);

/** Vừa đăng nhập xong (gọi từ form đăng nhập sau khi Supabase Auth nhận mật khẩu). */
export async function recordLogin(): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile || profile.locked_at) return;
  if (profile.role === "student") logActivity(profile, "login");
  else if (STAFF_ROLES.includes(profile.role)) auditLater(profile, "Đăng nhập trang thầy cô", undefined, { kind: "login", page: "/staff/login" });
}

/** Học sinh bấm nút "Cần giúp". */
export async function pressedHelpButton(): Promise<void> {
  const profile = await getCurrentProfile();
  if (profile?.role === "student") logActivity(profile, "help_button");
}

const openSchema = z.object({ kind: z.enum(["lesson", "tiny_action"]), ref: z.string().regex(/^[A-Za-z0-9._-]{1,80}$/) });

/** Học sinh mở một bài thư viện hoặc một việc nhỏ (đếm "được quan tâm nhất" ở Tổng quan app). */
export async function recordOpen(kind: "lesson" | "tiny_action", ref: string): Promise<void> {
  const parsed = openSchema.safeParse({ kind, ref });
  if (!parsed.success) return;
  const profile = await getCurrentProfile();
  if (profile?.role !== "student" || profile.locked_at) return;
  after(async () => {
    const { error } = await createAdminClient().from("content_opens").insert({ user_id: profile.id, ...parsed.data });
    // chưa chạy 0019 thì chưa có bảng: bỏ qua
    if (error && !MISSING.has(error.code)) console.error("[F-Mood] Ghi lượt mở bài lỗi", error.message);
  });
}

/** Thầy cô bấm tải CSV (việc tải diễn ra trên trình duyệt, ở đây chỉ ghi lại là đã xuất). */
export async function recordExport(what: string, rows: number, page: string): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role === "student" || profile.locked_at) return;
  const label = String(what).slice(0, 80);
  const where = typeof page === "string" && page.startsWith("/staff") ? page.slice(0, 120) : undefined;
  auditLater(profile, "Xuất dữ liệu", `${label} · ${Number(rows) || 0} dòng`, { kind: "export", page: where });
}

// ───────────────────────── Trang Nhật ký hoạt động (chỉ admin) ─────────────────────────

/** Bật / tắt ghi hoạt động học sinh. Bật là ghi, không giới hạn ngày. */
export async function setStudentLogging(enabled: boolean): Promise<{ ok: boolean }> {
  const profile = await requirePage("/staff/nhat-ky");
  try {
    await saveSetting("log.students", { enabled: enabled === true }, profile.nickname);
  } catch {
    return { ok: false };
  }
  await audit(profile, enabled ? "Bật ghi hoạt động học sinh" : "Tắt ghi hoạt động học sinh", undefined, { kind: "setting", page: "/staff/nhat-ky" });
  revalidatePath("/staff/nhat-ky");
  return { ok: true };
}

/** Xóa toàn bộ nhật ký hoạt động học sinh. Chỉ admin; ghi một dòng vào nhật ký thầy cô (số dòng đã xóa). */
export async function clearStudentLog(): Promise<{ ok: true; deleted: number } | { ok: false }> {
  const profile = await requirePage("/staff/nhat-ky");
  const db = createAdminClient();
  const { count } = await db.from("student_activity_log").select("id", { count: "exact", head: true });
  // Supabase cần một điều kiện để xóa: mọi id đều >= 0
  const { error } = await db.from("student_activity_log").delete().gte("id", 0);
  if (error) return { ok: false };
  await audit(profile, "Xóa toàn bộ nhật ký hoạt động học sinh", `${count ?? 0} dòng`, {
    kind: "log",
    page: "/staff/nhat-ky",
    targetType: "student_activity_log",
  });
  revalidatePath("/staff/nhat-ky");
  return { ok: true, deleted: count ?? 0 };
}

/**
 * Tra tên của một mã học sinh (ví dụ để hỗ trợ đăng nhập). Chỉ admin; MỖI lần tra đều ghi nhật ký,
 * kể cả khi không tìm thấy mã.
 */
export async function lookupStudentName(
  code: string,
): Promise<{ ok: true; nickname: string; fullName: string | null; className: string | null } | { ok: false; error: string }> {
  const profile = await requirePage("/staff/nhat-ky");
  const clean = String(code).trim().toUpperCase();
  if (!STUDENT_CODE_RE.test(clean)) return { ok: false, error: "Mã chưa đúng dạng HS-8A1-07." };
  const dir = await studentDirectory();
  const id = dir.byCode.get(clean);
  await audit(profile, "Tra tên học sinh từ mã nhật ký", clean, { kind: "log", page: "/staff/nhat-ky", targetType: "student", targetId: clean });
  if (!id || !dir.userOk(id)) return { ok: false, error: "Không có học sinh nào mang mã này." };
  const { data } = await createAdminClient()
    .from("profiles")
    .select("nickname, full_name, classes!profiles_class_id_fkey(name)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return { ok: false, error: "Không có học sinh nào mang mã này." };
  return {
    ok: true,
    nickname: data.nickname as string,
    fullName: (data.full_name as string | null) ?? null,
    className: (data.classes as unknown as { name: string } | null)?.name ?? null,
  };
}

