"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff, type Role } from "@/lib/auth";
import { requirePage, requireAnyPage } from "@/lib/permissions";
import { removeAvatarFiles } from "@/lib/avatar-server";
import { classCode, tempPassword } from "@/lib/password";
import { audit } from "@/lib/settings";
import { canResetStudentPassword, canSeeAlert } from "@/lib/staff";
import { canHandleAlerts } from "@/lib/staff-privacy";
import { createAdminClient } from "@/lib/supabase/admin";
import { blockInDemo } from "@/lib/demo/guard";
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

const alertSnapshot = z.object({
  status: z.enum(["new", "seen", "resolved"]),
  note: z.string().max(2000).nullable(),
  handled_by: z.uuid().nullable(),
  handled_by_name: z.string().max(80).nullable(),
  handled_at: z.string().max(40).nullable(),
  /** có từ 0013: lúc thầy cô nhận lần đầu (đo "nhận kịp trong 24 giờ") */
  first_handled_at: z.string().max(40).nullable().optional(),
});
export type AlertSnapshot = z.infer<typeof alertSnapshot>;
const ALERT_SNAPSHOT_COLS = "status, note, handled_by, handled_by_name, handled_at";

/** Đọc trạng thái hiện tại của cảnh báo (kèm first_handled_at nếu đã chạy 0013). */
async function readAlert(alertId: string): Promise<AlertSnapshot | null> {
  const db = createAdminClient();
  const withFirst = await db.from("alerts").select(`${ALERT_SNAPSHOT_COLS}, first_handled_at`).eq("id", alertId).maybeSingle();
  if (!withFirst.error) return withFirst.data as AlertSnapshot | null;
  const { data } = await db.from("alerts").select(ALERT_SNAPSHOT_COLS).eq("id", alertId).maybeSingle();
  return data as AlertSnapshot | null;
}

/** Ghi cảnh báo; chưa chạy 0013 (chưa có cột first_handled_at) thì ghi phần còn lại. */
async function writeAlert(alertId: string, patch: Record<string, unknown>) {
  const db = createAdminClient();
  const { error } = await db.from("alerts").update(patch).eq("id", alertId);
  if (error?.code === "42703" && "first_handled_at" in patch) {
    const rest = { ...patch };
    delete rest.first_handled_at;
    return (await db.from("alerts").update(rest).eq("id", alertId)).error;
  }
  return error;
}

/**
 * Phòng tham vấn / admin đổi trạng thái cảnh báo ("Tôi nhận", "Đã xong", "Mở lại").
 * Trả về trạng thái cũ để nút Hoàn tác đưa về đúng như trước.
 */
const ALERT_STATUS_LABEL = { new: "mở lại", seen: "nhận xử lý", resolved: "đánh dấu xong" } as const;

export async function updateAlert(
  alertId: string,
  input: { status: "new" | "seen" | "resolved"; note?: string },
): Promise<{ ok: true; undo: AlertSnapshot } | { ok: false; error: string }> {
  const profile = await requirePage("/staff/alerts");
  if (!canHandleAlerts(profile.role) || !(await canSeeAlert(profile, alertId))) return FORBIDDEN;
  if (!["new", "seen", "resolved"].includes(input.status)) return FAILED;
  const note = input.note?.trim().slice(0, 2000);

  const before = await readAlert(alertId);
  if (!before) return FAILED;
  const now = new Date().toISOString();
  const error = await writeAlert(alertId, {
    status: input.status,
    ...(note !== undefined ? { note: note || null } : {}),
    handled_by: profile.id,
    handled_by_name: profile.nickname,
    handled_at: now,
    // lần đầu có người nhận (rời trạng thái "mới")
    ...(before.status === "new" && input.status !== "new" && !before.first_handled_at ? { first_handled_at: now } : {}),
  });
  if (error) return FAILED;
  await audit(profile, `Cảnh báo: ${ALERT_STATUS_LABEL[input.status]}`, note ? "có ghi chú" : undefined, {
    kind: "alert_handle",
    page: "/staff/alerts",
    targetType: "alert",
    targetId: alertId,
  });
  refreshStaff();
  return { ok: true, undo: before };
}

/** Hoàn tác: chỉ khi thay đổi mới nhất vẫn là của chính mình (không đè lên việc đồng nghiệp vừa làm). */
export async function undoAlert(alertId: string, snapshot: AlertSnapshot): Promise<Result> {
  const profile = await requirePage("/staff/alerts");
  if (!canHandleAlerts(profile.role) || !(await canSeeAlert(profile, alertId))) return FORBIDDEN;
  const parsed = alertSnapshot.safeParse(snapshot);
  if (!parsed.success) return FAILED;
  const { data: now } = await createAdminClient().from("alerts").select("handled_by").eq("id", alertId).maybeSingle();
  if (now?.handled_by !== profile.id) return { ok: false, error: "Đồng nghiệp vừa cập nhật cảnh báo này nên không hoàn tác được." };
  // trả lại cả "lúc nhận lần đầu" (bấm nhầm "Tôi nhận" rồi hoàn tác thì không tính là đã nhận)
  const error = await writeAlert(alertId, { first_handled_at: null, ...parsed.data });
  if (error) return FAILED;
  await audit(profile, "Cảnh báo: hoàn tác", undefined, { kind: "alert_handle", page: "/staff/alerts", targetType: "alert", targetId: alertId });
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
  const profile = await requirePage("/staff/classes", ["admin"]);
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
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
  await audit(profile, classId ? "Sửa lớp" : "Tạo lớp", parsed.data.name, { kind: "account", page: "/staff/classes", targetType: "class", targetId: classId });
  refreshStaff();
  return { ok: true };
}

export async function regenerateClassCode(classId: string): Promise<Result> {
  const profile = await requirePage("/staff/classes", ["admin"]);
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const { error } = await createAdminClient().from("classes").update({ code: classCode() }).eq("id", classId);
  if (error) return FAILED;
  await audit(profile, "Đổi mã lớp", undefined, { kind: "account", page: "/staff/classes", targetType: "class", targetId: classId });
  refreshStaff();
  return { ok: true };
}

/**
 * Đánh dấu "lớp thử": học sinh lớp này thấy cả nội dung vòng hỗ trợ ở trạng thái "Chỉ lớp thử".
 * Dùng cho lớp chạy thử của nhóm, không dùng cho lớp thật.
 */
export async function setClassTest(classId: string, isTest: boolean): Promise<Result> {
  const profile = await requirePage("/staff/classes", ["admin"]);
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  if (!z.uuid().safeParse(classId).success) return FORBIDDEN;
  const { error } = await createAdminClient().from("classes").update({ is_test: isTest }).eq("id", classId);
  if (error) return { ok: false, error: "Chưa lưu được. Đã chạy supabase/migrations/0010_vong_ho_tro.sql chưa?" };
  await audit(profile, isTest ? "Đánh dấu lớp thử" : "Bỏ đánh dấu lớp thử", undefined, { kind: "account", page: "/staff/classes", targetType: "class", targetId: classId });
  refreshStaff();
  return { ok: true };
}

export async function deleteClass(classId: string): Promise<Result> {
  const profile = await requirePage("/staff/classes", ["admin"]);
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const admin = createAdminClient();
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId);
  if (count) return { ok: false, error: "Lớp còn học sinh. Chuyển hoặc xóa học sinh trước." };
  const { error } = await admin.from("classes").delete().eq("id", classId);
  if (error) return FAILED;
  await audit(profile, "Xóa lớp", undefined, { kind: "account", page: "/staff/classes", targetType: "class", targetId: classId });
  refreshStaff();
  return { ok: true };
}

// ───────────────────────── Học sinh ─────────────────────────

/** Nhật ký hoạt động: thao tác tài khoản ở trang Tài khoản. */
const ACCOUNT = { kind: "account", page: "/staff/members" } as const;

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
  const profile = await requireAnyPage(["/staff/classes", "/staff/members"]);
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
  await audit(profile, "Đặt mật khẩu tạm cho học sinh", undefined, { kind: "account", targetType: "student", targetId: studentId });
  return { ok: true, password };
}

export async function setStudentLocked(studentId: string, locked: boolean): Promise<Result> {
  const profile = await requireAnyPage(["/staff/classes", "/staff/members"], ["admin"]);
  if (!(await getStudent(studentId))) return FORBIDDEN;
  const res = await setLocked(studentId, locked);
  if (res.ok) await audit(profile, locked ? "Khóa tài khoản học sinh" : "Mở khóa tài khoản học sinh", undefined, { ...ACCOUNT, targetType: "student", targetId: studentId });
  return res;
}

export async function deleteStudent(studentId: string): Promise<Result> {
  const profile = await requireAnyPage(["/staff/classes", "/staff/members"], ["admin"]);
  if (!(await getStudent(studentId))) return FORBIDDEN;
  await removeAvatarFiles(studentId);
  const { error } = await createAdminClient().auth.admin.deleteUser(studentId);
  if (error) return FAILED;
  // tài khoản đã xóa: nhật ký chỉ còn mã id
  await audit(profile, "Xóa tài khoản học sinh", undefined, { ...ACCOUNT, targetType: "student", targetId: studentId });
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
  const profile = await requirePage("/staff/members");
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
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
  await audit(profile, "Tạo tài khoản thầy cô", `${name} · ${role}`, { ...ACCOUNT, targetType: "staff", targetId: data.user.id });
  refreshStaff();
  return { ok: true, password };
}

async function getStaffTarget(actorId: string, staffId: string) {
  if (actorId === staffId) return null; // không tự sửa / khóa / xóa chính mình ở đây
  const { data } = await createAdminClient().from("profiles").select("id, role").eq("id", staffId).maybeSingle();
  return data && data.role !== "student" ? data : null;
}

/** Đổi vai trò; trả về vai trò và lớp chủ nhiệm cũ để Hoàn tác. */
export async function updateStaffRole(
  staffId: string,
  role: Role,
): Promise<{ ok: true; undo: { role: Role; classIds: string[] } } | { ok: false; error: string }> {
  const profile = await requirePage("/staff/members");
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const target = await getStaffTarget(profile.id, staffId);
  if (!target) return FORBIDDEN;
  if (!STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number])) return FORBIDDEN;

  const admin = createAdminClient();
  const { data: classes } = await admin.from("classes").select("id").eq("homeroom_teacher_id", staffId);
  const { error } = await admin.from("profiles").update({ role }).eq("id", staffId);
  if (error) return FAILED;
  // không còn là GVCN thì bỏ khỏi các lớp đang chủ nhiệm
  if (role !== "teacher") {
    await admin.from("classes").update({ homeroom_teacher_id: null }).eq("homeroom_teacher_id", staffId);
  }
  await audit(profile, "Đổi vai trò thầy cô", `${target.role} → ${role}`, { ...ACCOUNT, targetType: "staff", targetId: staffId });
  refreshStaff();
  return { ok: true, undo: { role: target.role as Role, classIds: (classes ?? []).map((c) => c.id as string) } };
}

/** Hoàn tác đổi vai trò: trả lại vai trò cũ và các lớp chủ nhiệm cũ (nếu lớp chưa có ai khác nhận). */
export async function restoreStaffRole(staffId: string, undo: { role: Role; classIds: string[] }): Promise<Result> {
  const profile = await requirePage("/staff/members");
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  if (!(await getStaffTarget(profile.id, staffId))) return FORBIDDEN;
  if (!STAFF_ROLES.includes(undo.role as (typeof STAFF_ROLES)[number]) || !z.array(z.uuid()).max(50).safeParse(undo.classIds).success) return FAILED;
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ role: undo.role }).eq("id", staffId);
  if (error) return FAILED;
  if (undo.role === "teacher" && undo.classIds.length) {
    await admin.from("classes").update({ homeroom_teacher_id: staffId }).in("id", undo.classIds).is("homeroom_teacher_id", null);
  }
  await audit(profile, "Hoàn tác đổi vai trò thầy cô", `→ ${undo.role}`, { ...ACCOUNT, targetType: "staff", targetId: staffId });
  refreshStaff();
  return { ok: true };
}

export async function resetStaffPassword(staffId: string): Promise<PasswordResult> {
  const profile = await requirePage("/staff/members");
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  if (!(await getStaffTarget(profile.id, staffId))) return FORBIDDEN;
  const password = tempPassword();
  const { error } = await createAdminClient().auth.admin.updateUserById(staffId, { password });
  if (error) return FAILED;
  await audit(profile, "Đặt lại mật khẩu thầy cô", undefined, { ...ACCOUNT, targetType: "staff", targetId: staffId });
  return { ok: true, password };
}

export async function setStaffLocked(staffId: string, locked: boolean): Promise<Result> {
  const profile = await requirePage("/staff/members");
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  if (!(await getStaffTarget(profile.id, staffId))) return FORBIDDEN;
  const res = await setLocked(staffId, locked);
  if (res.ok) await audit(profile, locked ? "Khóa tài khoản thầy cô" : "Mở khóa tài khoản thầy cô", undefined, { ...ACCOUNT, targetType: "staff", targetId: staffId });
  return res;
}

export async function deleteStaff(staffId: string): Promise<Result> {
  const profile = await requirePage("/staff/members");
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  if (!(await getStaffTarget(profile.id, staffId))) return FORBIDDEN;
  const { error } = await createAdminClient().auth.admin.deleteUser(staffId);
  if (error) return FAILED;
  await audit(profile, "Xóa tài khoản thầy cô", undefined, { ...ACCOUNT, targetType: "staff", targetId: staffId });
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
