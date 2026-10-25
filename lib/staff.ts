import "server-only";
import { addDays, dayKey, startOfDayIso, weekdayLabel } from "@/lib/dates";
import { getEmotion, type EmotionGroup } from "@/lib/emotions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile, Role } from "@/lib/auth";

// LỚP TRUY CẬP DỮ LIỆU CHO THẦY CÔ / ADMIN
// Trang thầy cô đọc dữ liệu bằng quyền quản trị (bỏ qua RLS), nên MỌI hàm ở đây
// phải tự giới hạn theo vai trò:
//  - admin, phòng tham vấn: tất cả các lớp
//  - giáo viên chủ nhiệm: chỉ lớp mình chủ nhiệm
// Không hàm nào trả về check-in, trò chuyện hay thói quen của từng học sinh.

/** Số học sinh tối thiểu để hiện thống kê lớp (để không đoán ra được ai). */
export const MIN_GROUP = 3;

/** Các lớp người này được xem. null = tất cả. */
export async function visibleClassIds(profile: Profile): Promise<string[] | null> {
  if (profile.role === "admin" || profile.role === "counselor") return null;
  const { data } = await createAdminClient()
    .from("classes")
    .select("id")
    .eq("homeroom_teacher_id", profile.id);
  return (data ?? []).map((c) => c.id as string);
}

export async function canSeeClass(profile: Profile, classId: string): Promise<boolean> {
  const ids = await visibleClassIds(profile);
  return ids === null || ids.includes(classId);
}

/** Đặt lại mật khẩu học sinh: admin, hoặc GVCN của lớp học sinh đó. */
export async function canResetStudentPassword(profile: Profile, studentClassId: string | null) {
  if (profile.role === "admin") return true;
  if (profile.role !== "teacher" || !studentClassId) return false;
  const ids = await visibleClassIds(profile);
  return ids?.includes(studentClassId) ?? false;
}

// ───────────────────────── Lớp ─────────────────────────

export type ClassSummary = {
  id: string;
  name: string;
  code: string;
  grade: number | null;
  negative_streak_days: number;
  homeroom: { id: string; name: string } | null;
  studentCount: number;
  openAlerts: number;
};

export async function listClasses(profile: Profile): Promise<ClassSummary[]> {
  const ids = await visibleClassIds(profile);
  if (ids && ids.length === 0) return [];
  const admin = createAdminClient();

  let query = admin
    .from("classes")
    .select("id, name, code, grade, negative_streak_days, homeroom:profiles!classes_homeroom_teacher_id_fkey(id, nickname)")
    .order("name");
  if (ids) query = query.in("id", ids);
  const { data: classes } = await query;
  if (!classes?.length) return [];

  const classIds = classes.map((c) => c.id as string);
  const [{ data: students }, { data: alerts }] = await Promise.all([
    admin.from("profiles").select("class_id").eq("role", "student").in("class_id", classIds),
    admin.from("alerts").select("class_id").neq("status", "resolved").in("class_id", classIds),
  ]);
  const tally = (rows: { class_id: string | null }[] | null) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) if (r.class_id) m.set(r.class_id, (m.get(r.class_id) ?? 0) + 1);
    return m;
  };
  const studentCount = tally(students);
  const alertCount = tally(alerts);

  return classes.map((c) => {
    const h = c.homeroom as unknown as { id: string; nickname: string } | null;
    return {
      id: c.id,
      name: c.name,
      code: c.code,
      grade: c.grade,
      negative_streak_days: c.negative_streak_days,
      homeroom: h ? { id: h.id, name: h.nickname } : null,
      studentCount: studentCount.get(c.id) ?? 0,
      openAlerts: alertCount.get(c.id) ?? 0,
    };
  });
}

export async function getClass(profile: Profile, classId: string): Promise<ClassSummary | null> {
  if (!(await canSeeClass(profile, classId))) return null;
  const all = await listClasses(profile);
  return all.find((c) => c.id === classId) ?? null;
}

export type StudentRow = {
  id: string;
  nickname: string;
  full_name: string | null;
  created_at: string;
  locked_at: string | null;
  avatar: string | null;
};

/** Danh sách học sinh của lớp: chỉ thông tin tài khoản, không có nội dung riêng tư. */
export async function listStudents(profile: Profile, classId: string): Promise<StudentRow[]> {
  if (!(await canSeeClass(profile, classId))) return [];
  const query = (cols: string) =>
    createAdminClient().from("profiles").select(cols).eq("class_id", classId).eq("role", "student").order("nickname");
  const { data, error } = await query("id, nickname, full_name, created_at, locked_at, avatar");
  if (error?.code === "42703") {
    // chưa chạy migration 0006 (chưa có cột avatar)
    const { data: old } = await query("id, nickname, full_name, created_at, locked_at");
    return ((old ?? []) as unknown as Omit<StudentRow, "avatar">[]).map((s) => ({ ...s, avatar: null }));
  }
  return (data ?? []) as unknown as StudentRow[];
}

// ───────────────────────── Thống kê ẩn danh ─────────────────────────

export type ClassStats = {
  days: number;
  totalStudents: number;
  /** số học sinh có check-in trong khoảng thời gian */
  participants: number;
  enough: boolean;
  week: ({ day: string; label: string; enough: boolean } & Record<EmotionGroup, number>)[];
  top: { id: string; count: number }[];
  groups: Record<EmotionGroup, number>;
};

/**
 * Thống kê cảm xúc chung của lớp trong 7 ngày, KHÔNG gắn với học sinh nào.
 * Chỉ hiện khi có ít nhất MIN_GROUP học sinh check-in. Ngày nào ít hơn MIN_GROUP
 * học sinh thì để trống ngày đó.
 */
export async function classStats(profile: Profile, classId: string): Promise<ClassStats | null> {
  if (!(await canSeeClass(profile, classId))) return null;
  const admin = createAdminClient();
  const today = dayKey();
  const from = addDays(today, -6);

  const [{ count: totalStudents }, { data: rows }] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("class_id", classId).eq("role", "student"),
    admin
      .from("checkins")
      .select("user_id, emotions, created_at, profiles!inner(class_id)")
      .eq("profiles.class_id", classId)
      .gte("created_at", startOfDayIso(from)),
  ]);

  const participants = new Set<string>();
  const perDay = new Map<string, { users: Set<string>; emotions: string[] }>();
  for (const r of rows ?? []) {
    participants.add(r.user_id);
    const key = dayKey(r.created_at);
    const d = perDay.get(key) ?? { users: new Set(), emotions: [] };
    d.users.add(r.user_id);
    d.emotions.push(...(r.emotions as string[]));
    perDay.set(key, d);
  }

  const enough = participants.size >= MIN_GROUP;
  const groups: Record<EmotionGroup, number> = { positive: 0, neutral: 0, negative: 0 };
  const topMap = new Map<string, number>();
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(from, i);
    const d = perDay.get(day);
    const dayEnough = enough && (d?.users.size ?? 0) >= MIN_GROUP;
    const counts: Record<EmotionGroup, number> = { positive: 0, neutral: 0, negative: 0 };
    if (d && enough) {
      for (const id of d.emotions) {
        const e = getEmotion(id);
        if (!e) continue;
        groups[e.group] += 1;
        topMap.set(id, (topMap.get(id) ?? 0) + 1);
        if (dayEnough) counts[e.group] += 1;
      }
    }
    return { day, label: day === today ? "Nay" : weekdayLabel(day), enough: dayEnough, ...counts };
  });

  return {
    days: 7,
    totalStudents: totalStudents ?? 0,
    participants: participants.size,
    enough,
    week,
    top: [...topMap].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, count]) => ({ id, count })),
    groups,
  };
}

// ───────────────────────── Cảnh báo ─────────────────────────

export type AlertStatus = "new" | "seen" | "resolved";

export type AlertRow = {
  id: string;
  student_id: string | null;
  class_id: string | null;
  class_name: string | null;
  nickname: string;
  full_name: string | null;
  type: "chat_risk" | "negative_streak" | "lesson_risk" | "help_request" | "worry_worse";
  severity: "watch" | "urgent";
  excerpt: string | null;
  reasons: string[];
  status: AlertStatus;
  note: string | null;
  handled_by_name: string | null;
  handled_at: string | null;
  created_at: string;
};

export async function listAlerts(
  profile: Profile,
  { status, classId, limit = 100 }: { status?: AlertStatus | "open"; classId?: string; limit?: number } = {},
): Promise<AlertRow[]> {
  const ids = await visibleClassIds(profile);
  if (ids && ids.length === 0) return [];
  if (classId && ids && !ids.includes(classId)) return [];

  let query = createAdminClient()
    .from("alerts")
    .select(
      "id, student_id, class_id, nickname, full_name, type, severity, excerpt, reasons, status, note, handled_by_name, handled_at, created_at, classes(name)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (ids) query = query.in("class_id", ids);
  if (classId) query = query.eq("class_id", classId);
  if (status === "open") query = query.neq("status", "resolved");
  else if (status) query = query.eq("status", status);

  const { data } = await query;
  return (data ?? []).map((a) => ({
    ...(a as unknown as Omit<AlertRow, "class_name">),
    class_name: (a.classes as unknown as { name: string } | null)?.name ?? null,
  }));
}

/** Số cảnh báo chưa xem (để hiện trên thanh điều hướng). */
export async function countNewAlerts(profile: Profile): Promise<{ total: number; urgent: number }> {
  const ids = await visibleClassIds(profile);
  if (ids && ids.length === 0) return { total: 0, urgent: 0 };
  let query = createAdminClient().from("alerts").select("severity").eq("status", "new");
  if (ids) query = query.in("class_id", ids);
  const { data } = await query;
  return {
    total: data?.length ?? 0,
    urgent: data?.filter((a) => a.severity === "urgent").length ?? 0,
  };
}

export async function canSeeAlert(profile: Profile, alertId: string): Promise<boolean> {
  const { data } = await createAdminClient().from("alerts").select("class_id").eq("id", alertId).maybeSingle();
  if (!data) return false;
  const ids = await visibleClassIds(profile);
  // cảnh báo không còn gắn lớp (lớp đã bị xóa) chỉ admin / phòng tham vấn thấy
  return ids === null || (data.class_id !== null && ids.includes(data.class_id));
}

// ───────────────────────── Thầy cô ─────────────────────────

export type StaffRow = {
  id: string;
  name: string;
  email: string | null;
  role: Exclude<Role, "student">;
  locked_at: string | null;
  created_at: string;
  classes: string[];
};

export async function listStaff(): Promise<StaffRow[]> {
  const admin = createAdminClient();
  const [{ data: staff }, { data: classes }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, nickname, email, role, locked_at, created_at")
      .neq("role", "student")
      .order("nickname"),
    admin.from("classes").select("name, homeroom_teacher_id").not("homeroom_teacher_id", "is", null),
  ]);
  return (staff ?? []).map((s) => ({
    id: s.id,
    name: s.nickname,
    email: s.email,
    role: s.role,
    locked_at: s.locked_at,
    created_at: s.created_at,
    classes: (classes ?? []).filter((c) => c.homeroom_teacher_id === s.id).map((c) => c.name),
  }));
}
