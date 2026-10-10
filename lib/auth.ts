import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "student" | "teacher" | "counselor" | "admin";

export type Profile = {
  id: string;
  nickname: string;
  full_name: string | null;
  email: string | null;
  class_id: string | null;
  role: Role;
  onboarded_at: string | null;
  locked_at: string | null;
  avatar: string | null;
};

export const STAFF_ROLES: Role[] = ["teacher", "counselor", "admin"];

export const ROLE_LABEL: Record<Role, string> = {
  student: "Học sinh",
  teacher: "Giáo viên chủ nhiệm",
  counselor: "Phòng tham vấn",
  admin: "Admin",
};

/**
 * Người đang đăng nhập (đã xác thực với Supabase Auth).
 * Bọc trong cache() để mỗi request chỉ hỏi một lần.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, nickname, full_name, email, class_id, role, onboarded_at, locked_at, avatar")
    .eq("id", user.id)
    .maybeSingle();
  if (error?.code === "42703") {
    // chưa chạy migration 0006 (chưa có cột avatar): vẫn đăng nhập được, dùng ảnh mặc định
    const { data: old } = await supabase
      .from("profiles")
      .select("id, nickname, full_name, email, class_id, role, onboarded_at, locked_at")
      .eq("id", user.id)
      .maybeSingle();
    return old ? ({ ...old, avatar: null } as Profile) : null;
  }
  return (data as Profile | null) ?? null;
});

/**
 * Bắt buộc là học sinh đang đăng nhập.
 * Phiên hỏng / tài khoản bị khóa thì đăng xuất hẳn (tránh vòng lặp chuyển trang).
 * Thầy cô vào nhầm trang học sinh thì chuyển sang trang quản lý.
 */
export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile || profile.locked_at) redirect("/signout");
  if (profile.role !== "student") redirect("/staff");
  return profile;
}

/** Bắt buộc là thầy cô / admin. Có thể giới hạn thêm vai trò. */
export async function requireStaff(roles: Role[] = STAFF_ROLES): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile || profile.locked_at) redirect("/signout?to=/staff/login");
  if (profile.role === "student") redirect("/home");
  if (!roles.includes(profile.role)) redirect("/staff");
  return profile;
}
