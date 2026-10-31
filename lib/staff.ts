import "server-only";
import { addDays, dayKey, startOfDayIso, weekdayLabel } from "@/lib/dates";
import { getEmotion, type EmotionGroup } from "@/lib/emotions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile, Role } from "@/lib/auth";
import { alertForViewer, canHandleAlerts, MIN_GROUP } from "@/lib/staff-privacy";
import { classScope, dataScope, inClassScope } from "@/lib/demo/server";
import { allowsClass } from "@/lib/demo/shared";

// LỚP TRUY CẬP DỮ LIỆU CHO THẦY CÔ / ADMIN
// Trang thầy cô đọc dữ liệu bằng quyền quản trị (bỏ qua RLS), nên MỌI hàm ở đây
// phải tự giới hạn theo vai trò:
//  - admin, phòng tham vấn: tất cả các lớp
//  - giáo viên chủ nhiệm: chỉ lớp mình chủ nhiệm
//  - lớp mẫu (chế độ trình diễn) chỉ hiện khi admin bật trình diễn; khi đó lớp thật bị ẩn (lib/demo/server.ts)
// Không hàm nào trả về check-in, trò chuyện hay thói quen của từng học sinh.

/** Số học sinh tối thiểu để hiện thống kê lớp (để không đoán ra được ai). */
export { MIN_GROUP };

/** Các lớp người này được xem. null = mọi lớp thật (khi đó phải lọc bằng classScope để bỏ lớp mẫu). */
export async function visibleClassIds(profile: Profile): Promise<string[] | null> {
  const scope = await classScope(profile);
  return scope.kind === "only" ? scope.ids : null;
}

export async function canSeeClass(profile: Profile, classId: string): Promise<boolean> {
  return allowsClass(await classScope(profile), classId);
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
  const scope = await classScope(profile);
  if (scope.kind === "only" && scope.ids.length === 0) return [];
  const admin = createAdminClient();

  const query = admin
    .from("classes")
    .select("id, name, code, grade, negative_streak_days, homeroom:profiles!classes_homeroom_teacher_id_fkey(id, nickname)")
    .order("name");
  const { data: classes } = await inClassScope(query, scope, "id");
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
  type: "chat_risk" | "negative_streak" | "lesson_risk" | "help_request" | "worry_worse" | "survey_risk";
  severity: "watch" | "urgent";
  excerpt: string | null;
  reasons: string[];
  status: AlertStatus;
  note: string | null;
  handled_by: string | null;
  handled_by_name: string | null;
  handled_at: string | null;
  created_at: string;
  /** giáo viên chủ nhiệm: máy chủ đã bỏ nội dung, lý do và ghi chú */
  contentHidden: boolean;
  /** số cảnh báo khác của cùng học sinh (chỉ phòng tham vấn / admin thấy) */
  otherAlerts: number;
};

export async function listAlerts(
  profile: Profile,
  {
    status,
    classId,
    studentId,
    mine = false,
    limit = 100,
  }: { status?: AlertStatus | "open"; classId?: string; studentId?: string; mine?: boolean; limit?: number } = {},
): Promise<AlertRow[]> {
  const scope = await classScope(profile);
  if (scope.kind === "only" && scope.ids.length === 0) return [];
  if (classId && !allowsClass(scope, classId)) return [];

  let query = createAdminClient()
    .from("alerts")
    .select(
      "id, student_id, class_id, nickname, full_name, type, severity, excerpt, reasons, status, note, handled_by, handled_by_name, handled_at, created_at, classes(name)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  query = inClassScope(query, scope);
  if (classId) query = query.eq("class_id", classId);
  if (studentId) query = query.eq("student_id", studentId);
  if (mine) query = query.eq("handled_by", profile.id);
  if (status === "open") query = query.neq("status", "resolved");
  else if (status) query = query.eq("status", status);

  const { data } = await query;
  const rows = (data ?? []) as unknown as (Omit<AlertRow, "class_name" | "contentHidden" | "otherAlerts"> & { classes: unknown })[];

  // em này còn những cảnh báo nào khác (để tư vấn viên thấy cả quá trình)
  const others = new Map<string, number>();
  const studentIds = [...new Set(rows.map((a) => a.student_id).filter((x): x is string => Boolean(x)))];
  if (canHandleAlerts(profile.role) && studentIds.length) {
    const { data: all } = await createAdminClient().from("alerts").select("student_id").in("student_id", studentIds);
    for (const r of all ?? []) others.set(r.student_id, (others.get(r.student_id) ?? 0) + 1);
  }

  return rows.map(({ classes, ...a }) =>
    alertForViewer(
      {
        ...a,
        class_name: (classes as { name: string } | null)?.name ?? null,
        otherAlerts: a.student_id ? Math.max(0, (others.get(a.student_id) ?? 1) - 1) : 0,
      },
      profile.role,
    ),
  );
}

/** Số cảnh báo chưa xem (để hiện trên thanh điều hướng). */
export async function countNewAlerts(profile: Profile): Promise<{ total: number; urgent: number }> {
  const scope = await classScope(profile);
  if (scope.kind === "only" && scope.ids.length === 0) return { total: 0, urgent: 0 };
  const { data } = await inClassScope(createAdminClient().from("alerts").select("severity").eq("status", "new"), scope);
  return {
    total: data?.length ?? 0,
    urgent: data?.filter((a) => a.severity === "urgent").length ?? 0,
  };
}

export async function canSeeAlert(profile: Profile, alertId: string): Promise<boolean> {
  const { data } = await createAdminClient().from("alerts").select("class_id").eq("id", alertId).maybeSingle();
  if (!data) return false;
  // cảnh báo không còn gắn lớp (lớp đã bị xóa) chỉ admin / phòng tham vấn thấy, và không thấy lúc đang trình diễn
  return allowsClass(await classScope(profile), data.class_id);
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
  const [{ data: staff }, { data: classes }, scope] = await Promise.all([
    admin
      .from("profiles")
      .select("id, nickname, email, role, locked_at, created_at")
      .neq("role", "student")
      .order("nickname"),
    admin.from("classes").select("name, homeroom_teacher_id").not("homeroom_teacher_id", "is", null),
    dataScope(),
  ]);
  // thầy cô mẫu chỉ hiện khi đang trình diễn (và khi đó chỉ hiện thầy cô mẫu)
  return (staff ?? []).filter((s) => scope.userOk(s.id)).map((s) => ({
    id: s.id,
    name: s.nickname,
    email: s.email,
    role: s.role,
    locked_at: s.locked_at,
    created_at: s.created_at,
    classes: (classes ?? []).filter((c) => c.homeroom_teacher_id === s.id).map((c) => c.name),
  }));
}
