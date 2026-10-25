"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff, type Role } from "@/lib/auth";
import { removeAvatarFiles } from "@/lib/avatar-server";
import { classCode, tempPassword } from "@/lib/password";
import { audit } from "@/lib/settings";
import { canResetStudentPassword, canSeeAlert } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fullNameSchema, passwordSchema } from "@/lib/validation";

// Mọi thao tác ở đây đều kiểm tra lại vai trò ở phía server,
// không tin vào việc giao diện đã ẩn nút.

type Result = { ok: true } | { ok: false; error: string };
type PasswordResult = { ok: true; password: string } | { ok: false; error: string };

const FORBIDDEN = { ok: false as const, error: "Bạn không có quyền làm việc này." };
const FAILED = { ok: false as const, error: "Chưa lưu được. Thử lại nhé." };
const LOCK_FOREVER = "876000h"; // khoảng 100 năm

function refreshStaff() {
  revalidatePath("/staff", "layout");
}

// ───────────────────────── Cảnh báo ─────────────────────────

export async function updateAlert(
  alertId: string,
  input: { status: "new" | "seen" | "resolved"; note?: string },
): Promise<Result> {
  const profile = await requireStaff();
  if (!(await canSeeAlert(profile, alertId))) return FORBIDDEN;
  const note = input.note?.trim().slice(0, 2000);

  const { error } = await createAdminClient()
    .from("alerts")
    .update({
      status: input.status,
      ...(note !== undefined ? { note: note || null } : {}),
      handled_by: profile.id,
      handled_by_name: profile.nickname,
      handled_at: new Date().toISOString(),
    })
    .eq("id", alertId);
  if (error) return FAILED;
  refreshStaff();
  return { ok: true };
}

// ───────────────────────── Lớp (admin) ─────────────────────────

const classSchema = z.object({
  name: z.string().trim().min(1, "Nhập tên lớp").max(40),
  grade: z.coerce.number().int().min(6).max(12).nullable(),
  negative_streak_days: z.coerce.number().int().min(2, "Ít nhất 2 ngày").max(30, "Tối đa 30 ngày"),
  homeroom_teacher_id: z.uuid().nullable(),
});

export async function saveClass(
  classId: string | null,
  input: { name: string; grade: string; negative_streak_days: string; homeroom_teacher_id: string },
): Promise<Result> {
  await requireStaff(["admin"]);
  const parsed = classSchema.safeParse({
    ...input,
    grade: input.grade || null,
    homeroom_teacher_id: input.homeroom_teacher_id || null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const admin = createAdminClient();
  if (parsed.data.homeroom_teacher_id) {
    const { data: t } = await admin
      .from("profiles")
      .select("role")
      .eq("id", parsed.data.homeroom_teacher_id)
      .maybeSingle();
    if (t?.role !== "teacher") return { ok: false, error: "Người được chọn không phải giáo viên chủ nhiệm." };
  }

  const { error } = classId
    ? await admin.from("classes").update(parsed.data).eq("id", classId)
    : await admin.from("classes").insert({ ...parsed.data, code: classCode() });
  if (error) return error.code === "23505" ? { ok: false, error: "Trùng mã lớp, thử lại." } : FAILED;
  refreshStaff();
  return { ok: true };
}

export async function regenerateClassCode(classId: string): Promise<Result> {
  await requireStaff(["admin"]);
  const { error } = await createAdminClient().from("classes").update({ code: classCode() }).eq("id", classId);
  if (error) return FAILED;
  refreshStaff();
  return { ok: true };
}

/**
 * Đánh dấu "lớp thử": học sinh lớp này thấy cả nội dung vòng hỗ trợ ở trạng thái "Chỉ lớp thử".
 * Dùng cho lớp chạy thử của nhóm, không dùng cho lớp thật.
 */
export async function setClassTest(classId: string, isTest: boolean): Promise<Result> {
  const profile = await requireStaff(["admin"]);
  if (!z.uuid().safeParse(classId).success) return FORBIDDEN;
  const { error } = await createAdminClient().from("classes").update({ is_test: isTest }).eq("id", classId);
  if (error) return { ok: false, error: "Chưa lưu được. Đã chạy supabase/migrations/0010_vong_ho_tro.sql chưa?" };
  await audit(profile, isTest ? "Đánh dấu lớp thử" : "Bỏ đánh dấu lớp thử", classId);
  refreshStaff();
  return { ok: true };
}

export async function deleteClass(classId: string): Promise<Result> {
  await requireStaff(["admin"]);
  const admin = createAdminClient();
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId);
  if (count) return { ok: false, error: "Lớp còn học sinh. Chuyển hoặc xóa học sinh trước." };
  const { error } = await admin.from("classes").delete().eq("id", classId);
  if (error) return FAILED;
  refreshStaff();
  return { ok: true };
}

// ───────────────────────── Học sinh ─────────────────────────

async function getStudent(studentId: string) {
  const { data } = await createAdminClient()
    .from("profiles")
    .select("id, class_id, role")
    .eq("id", studentId)
    .maybeSingle();
  return data?.role === "student" ? data : null;
}

/** Đặt mật khẩu tạm cho học sinh quên mật khẩu (admin hoặc GVCN lớp đó). */
export async function resetStudentPassword(studentId: string): Promise<PasswordResult> {
  const profile = await requireStaff();
  const student = await getStudent(studentId);
  if (!student || !(await canResetStudentPassword(profile, student.class_id))) return FORBIDDEN;

  const password = tempPassword();
  // học sinh phải tự đặt mật khẩu mới ngay khi đăng nhập bằng mật khẩu tạm,
  // nên mật khẩu tạm không mở được dữ liệu riêng của học sinh
  const { error } = await createAdminClient().auth.admin.updateUserById(studentId, {
    password,
    app_metadata: { must_change_password: true },
  });
  if (error) return FAILED;
  // ghi lại ai đã đặt mật khẩu tạm
  await audit(profile, "Đặt mật khẩu tạm cho học sinh", studentId);
  return { ok: true, password };
}

export async function setStudentLocked(studentId: string, locked: boolean): Promise<Result> {
  await requireStaff(["admin"]);
  if (!(await getStudent(studentId))) return FORBIDDEN;
  return setLocked(studentId, locked);
}

export async function deleteStudent(studentId: string): Promise<Result> {
  await requireStaff(["admin"]);
  if (!(await getStudent(studentId))) return FORBIDDEN;
  await removeAvatarFiles(studentId);
  const { error } = await createAdminClient().auth.admin.deleteUser(studentId);
  if (error) return FAILED;
  refreshStaff();
  return { ok: true };
}

async function setLocked(userId: string, locked: boolean): Promise<Result> {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: locked ? LOCK_FOREVER : "none",
  });
  if (error) return FAILED;
  await admin
    .from("profiles")
    .update({ locked_at: locked ? new Date().toISOString() : null })
    .eq("id", userId);
  refreshStaff();
  return { ok: true };
}

// ───────────────────────── Thầy cô (admin) ─────────────────────────

const STAFF_ROLES = ["teacher", "counselor", "admin"] as const;

const staffSchema = z.object({
  name: fullNameSchema,
  email: z.email("Email chưa đúng").transform((s) => s.trim().toLowerCase()),
  role: z.enum(STAFF_ROLES),
});

/** Admin tạo tài khoản thầy cô, trả về mật khẩu tạm để đưa cho thầy cô. */
export async function createStaff(input: { name: string; email: string; role: string }): Promise<PasswordResult> {
  await requireStaff(["admin"]);
  const parsed = staffSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { name, email, role } = parsed.data;

  const admin = createAdminClient();
  const password = tempPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error || !data.user) {
    return {
      ok: false,
      error: error?.code === "email_exists" ? "Email này đã có tài khoản." : "Chưa tạo được tài khoản.",
    };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .insert({ id: data.user.id, nickname: name, full_name: name, email, role, onboarded_at: new Date().toISOString() });
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return FAILED;
  }
  refreshStaff();
  return { ok: true, password };
}

async function getStaffTarget(actorId: string, staffId: string) {
  if (actorId === staffId) return null; // không tự sửa / khóa / xóa chính mình ở đây
  const { data } = await createAdminClient().from("profiles").select("id, role").eq("id", staffId).maybeSingle();
  return data && data.role !== "student" ? data : null;
}

export async function updateStaffRole(staffId: string, role: Role): Promise<Result> {
  const profile = await requireStaff(["admin"]);
  if (!(await getStaffTarget(profile.id, staffId))) return FORBIDDEN;
  if (!STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number])) return FORBIDDEN;

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ role }).eq("id", staffId);
  if (error) return FAILED;
  // không còn là GVCN thì bỏ khỏi các lớp đang chủ nhiệm
  if (role !== "teacher") {
    await admin.from("classes").update({ homeroom_teacher_id: null }).eq("homeroom_teacher_id", staffId);
  }
  refreshStaff();
  return { ok: true };
}

export async function resetStaffPassword(staffId: string): Promise<PasswordResult> {
  const profile = await requireStaff(["admin"]);
  if (!(await getStaffTarget(profile.id, staffId))) return FORBIDDEN;
  const password = tempPassword();
  const { error } = await createAdminClient().auth.admin.updateUserById(staffId, { password });
  if (error) return FAILED;
  return { ok: true, password };
}

export async function setStaffLocked(staffId: string, locked: boolean): Promise<Result> {
  const profile = await requireStaff(["admin"]);
  if (!(await getStaffTarget(profile.id, staffId))) return FORBIDDEN;
  return setLocked(staffId, locked);
}

export async function deleteStaff(staffId: string): Promise<Result> {
  const profile = await requireStaff(["admin"]);
  if (!(await getStaffTarget(profile.id, staffId))) return FORBIDDEN;
  const { error } = await createAdminClient().auth.admin.deleteUser(staffId);
  if (error) return FAILED;
  refreshStaff();
  return { ok: true };
}

// ───────────────────────── Tài khoản của chính mình ─────────────────────────

export async function changeStaffPassword(input: { password: string; confirm: string }): Promise<Result> {
  await requireStaff();
  const parsed = passwordSchema.safeParse(input.password);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (parsed.data.length < 8) return { ok: false, error: "Mật khẩu thầy cô cần ít nhất 8 ký tự." };
  if (input.password !== input.confirm) return { ok: false, error: "Hai mật khẩu chưa giống nhau." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    return {
      ok: false,
      error: error.code === "same_password" ? "Mật khẩu mới cần khác mật khẩu cũ." : "Chưa đổi được mật khẩu.",
    };
  }
  return { ok: true };
}
