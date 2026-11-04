"use server";

import { after } from "next/server";
import { z } from "zod";
import { getCurrentProfile, STAFF_ROLES } from "@/lib/auth";
import { auditLater } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";

// GHI TỪ TRÌNH DUYỆT: thầy cô đăng nhập và tải CSV (nhật ký thầy cô), học sinh mở bài (chỉ để đếm chung ở Tổng quan app).
// Các hàm ghi trả lời ngay rồi mới ghi (after), để không làm chậm việc học sinh / thầy cô đang làm.
// Không bao giờ nhận hay ghi chữ học sinh viết. Không có nhật ký hoạt động học sinh (Duy bỏ hẳn 04/11).

const MISSING = new Set(["42P01", "42703", "PGRST204", "PGRST205"]);

/** Thầy cô vừa đăng nhập xong (gọi từ form đăng nhập trang thầy cô sau khi Supabase Auth nhận mật khẩu). */
export async function recordLogin(): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile || profile.locked_at) return;
  if (STAFF_ROLES.includes(profile.role)) auditLater(profile, "Đăng nhập trang thầy cô", undefined, { kind: "login", page: "/staff/login" });
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
