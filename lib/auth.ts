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
  /** thầy cô vừa đặt mật khẩu tạm: phải tự đặt mật khẩu mới trước khi dùng app */
  must_change_password: boolean;
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
  // cờ nằm trong app_metadata: chỉ máy chủ (quyền quản trị) sửa được, học sinh không tự gỡ được
  const mustChange = user.app_metadata?.must_change_password === true;

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
    return old ? ({ ...old, avatar: null, must_change_password: mustChange } as Profile) : null;
  }
  return data ? ({ ...data, must_change_password: mustChange } as Profile) : null;
});

/**
 * Bắt buộc là học sinh đang đăng nhập.
 * Phiên hỏng / tài khoản bị khóa thì đăng xuất hẳn (tránh vòng lặp chuyển trang).
 * Thầy cô vào nhầm trang học sinh thì chuyển sang trang quản lý.
 * Đang dùng mật khẩu tạm thầy cô đặt thì chỉ vào được trang đặt mật khẩu mới,
 * để người biết mật khẩu tạm (thầy cô) không xem được dữ liệu riêng của học sinh.
 */
export async function requireProfile({ allowPasswordChange = false } = {}): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile || profile.locked_at) redirect("/signout");
  if (profile.role !== "student") redirect("/staff");
  if (profile.must_change_password && !allowPasswordChange) redirect("/doi-mat-khau");
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
