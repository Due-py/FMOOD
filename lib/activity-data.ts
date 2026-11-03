import "server-only";
import { addDays, dayKey, startOfDayIso } from "@/lib/dates";
import { auditKindOf, classTag, studentCodes, type AuditKind } from "@/lib/audit-shared";
import { dataScope } from "@/lib/demo/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ĐỌC NHẬT KÝ HOẠT ĐỘNG CHO TRANG "NHẬT KÝ HOẠT ĐỘNG" (kế hoạch Demo 3, 12.2 và 12.5).
// Trang gọi các hàm này PHẢI requireStaff(["admin"]) trước. Học sinh chỉ hiện bằng mã (HS-8A1-07),
// không bao giờ trả về họ tên hay biệt danh; tra tên là một thao tác riêng, có ghi nhật ký (app/actions/activity.ts).

const db = () => createAdminClient();
const MISSING = new Set(["42P01", "42703", "PGRST204", "PGRST205"]);
/** Số dòng tối đa đọc một lần (trang chỉ để xem và xuất, không phải kho lưu). */
export const LOG_LIMIT = 3000;

export type ClassOption = { id: string; name: string; tag: string };

/** Danh bạ mã học sinh: id → mã, mã → id. Theo phạm vi trình diễn như các trang khác. */
export async function studentDirectory() {
  const [{ data: students }, { data: classes }, scope] = await Promise.all([
    db().from("profiles").select("id, class_id, created_at").eq("role", "student"),
    db().from("classes").select("id, name"),
    dataScope(),
  ]);
  const all = (students ?? []) as { id: string; class_id: string | null; created_at: string }[];
  const cls = (classes ?? []) as { id: string; name: string | null }[];
  const codes = studentCodes(all, cls);
  const byCode = new Map([...codes].map(([id, code]) => [code, id]));
  const classOf = new Map(all.map((s) => [s.id, s.class_id]));
  // mã tính trên MỌI lớp (để không đổi khi bật / tắt trình diễn), danh sách lọc chỉ có lớp trong phạm vi
  const classOptions: ClassOption[] = cls
    .filter((c) => scope.classOk(c.id))
    .map((c) => ({ id: c.id, name: c.name ?? "Lớp", tag: classTag(c.name) }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  return { codes, byCode, classOf, classOptions, userOk: scope.userOk };
}

// ───────────────────────── Nhật ký thầy cô ─────────────────────────

export type StaffLogRow = {
  id: number;
  at: string;
  actorId: string | null;
  actorName: string;
  role: string | null;
  kind: AuditKind;
  action: string;
  detail: string | null;
  page: string | null;
  target: string | null;
};

export type StaffLogFilter = { actorId?: string; role?: string; kind?: AuditKind; from?: string; to?: string };

/** Thao tác cũ có ghi biệt danh học sinh vào phần chi tiết: không hiện chi tiết đó. */
const STUDENT_NAME_DETAIL = new Set(["Chuyển lớp học sinh"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function staffLog(f: StaffLogFilter) {
  const [dir, { data: people }, scope] = await Promise.all([
    studentDirectory(),
    db().from("profiles").select("id, nickname, role").neq("role", "student").order("nickname"),
    dataScope(),
  ]);
  let q = db().from("admin_audit").select("*").order("created_at", { ascending: false }).limit(LOG_LIMIT);
  if (f.actorId) q = q.eq("actor_id", f.actorId);
  if (f.from) q = q.gte("created_at", startOfDayIso(f.from));
  if (f.to) q = q.lt("created_at", startOfDayIso(addDays(f.to, 1)));
  const { data, error } = await q;
  if (error) console.error("[F-Mood] Đọc nhật ký thầy cô lỗi", error.message);

  const roleOf = new Map((people ?? []).map((p) => [p.id as string, p.role as string]));
  // học sinh (ví dụ tự đặt mật khẩu mới) và mã học sinh trong chi tiết / đối tượng: hiện bằng mã
  const show = (v: string | null) => (v && UUID.test(v) && dir.codes.has(v) ? (dir.codes.get(v) as string) : v);
  type Raw = {
    id: number;
    created_at: string;
    actor_id: string | null;
    actor_name: string;
    action: string;
    detail: string | null;
    actor_role?: string | null;
    kind?: string | null;
    page?: string | null;
    target_type?: string | null;
    target_id?: string | null;
  };
  const rows: StaffLogRow[] = ((data ?? []) as Raw[])
    // trình diễn: chỉ việc của thầy cô mẫu; bình thường: không có việc của thầy cô mẫu
    .filter((a) => (scope.demo ? scope.demoUsers.has(a.actor_id ?? "") : !a.actor_id || !scope.demoUsers.has(a.actor_id)))
    .map((a) => {
      const studentActor = a.actor_id ? dir.codes.get(a.actor_id) : undefined;
      return {
        id: a.id,
        at: a.created_at,
        actorId: a.actor_id,
        actorName: studentActor ?? a.actor_name,
        role: a.actor_role ?? (studentActor ? "student" : a.actor_id ? (roleOf.get(a.actor_id) ?? null) : null),
        kind: auditKindOf(a),
        action: a.action,
        detail: STUDENT_NAME_DETAIL.has(a.action) ? null : show(a.detail),
        page: a.page ?? null,
        target: a.target_type ? `${a.target_type}${a.target_id ? `: ${show(a.target_id)}` : ""}` : null,
      };
    })
    .filter((r) => (!f.role || r.role === f.role) && (!f.kind || r.kind === f.kind));

  return {
    ready: !error,
    rows,
    truncated: (data ?? []).length >= LOG_LIMIT,
    members: (people ?? [])
      .filter((p) => scope.userOk(p.id as string))
      .map((p) => ({ id: p.id as string, name: p.nickname as string, role: p.role as string })),
  };
}

// ───────────────────────── Nhật ký học sinh ─────────────────────────

/** content: lời học sinh viết / tâm trạng, chỉ có ở dòng ghi lúc admin bật ghi lời (migration 0028) */
export type StudentLogRow = { id: number; at: string; code: string; classTag: string; kind: string; ref: string | null; content: string | null };
export type StudentLogFilter = { classId?: string; code?: string; kind?: string; from?: string; to?: string };

export async function studentLog(f: StudentLogFilter) {
  const dir = await studentDirectory();
  const userId = f.code ? dir.byCode.get(f.code) : undefined;
  if (f.code && !userId) return { ready: true, rows: [] as StudentLogRow[], truncated: false, perDay: [], classOptions: dir.classOptions, unknownCode: true };

  const read = (cols: string) => {
    let q = db().from("student_activity_log").select(cols).order("created_at", { ascending: false }).limit(LOG_LIMIT);
    if (userId) q = q.eq("user_id", userId);
    if (f.classId) q = q.eq("class_id", f.classId);
    if (f.kind) q = q.eq("kind", f.kind);
    if (f.from) q = q.gte("created_at", startOfDayIso(f.from));
    if (f.to) q = q.lt("created_at", startOfDayIso(addDays(f.to, 1)));
    return q;
  };
  let { data, error } = await read("id, user_id, class_id, kind, ref, content, created_at");
  // chưa chạy 0028 (chưa có cột content): đọc như bản cũ
  if (error?.code === "42703") ({ data, error } = await read("id, user_id, class_id, kind, ref, created_at"));
  if (error && !MISSING.has(error.code)) console.error("[F-Mood] Đọc nhật ký học sinh lỗi", error.message);

  const tagOf = new Map(dir.classOptions.map((c) => [c.id, c.tag]));
  const rows: StudentLogRow[] = ((data ?? []) as unknown as { id: number; user_id: string; class_id: string | null; kind: string; ref: string | null; content?: string | null; created_at: string }[])
    .filter((r) => dir.userOk(r.user_id))
    .map((r) => ({
      id: r.id,
      at: r.created_at,
      code: dir.codes.get(r.user_id) ?? "HS-?",
      // lớp lúc ghi (học sinh có thể đã chuyển lớp sau đó)
      classTag: (r.class_id && tagOf.get(r.class_id)) || "–",
      kind: r.kind,
      ref: r.ref,
      content: r.content ?? null,
    }));

  // đếm theo ngày (giờ Việt Nam), mới nhất trước
  const days = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const d = dayKey(r.at);
    const m = days.get(d) ?? new Map<string, number>();
    m.set(r.kind, (m.get(r.kind) ?? 0) + 1);
    days.set(d, m);
  }
  const perDay = [...days]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([day, m]) => ({ day, total: [...m.values()].reduce((s, n) => s + n, 0), students: new Set(rows.filter((r) => dayKey(r.at) === day).map((r) => r.code)).size, counts: Object.fromEntries(m) }));

  return {
    ready: !error || !MISSING.has(error.code),
    rows,
    truncated: (data ?? []).length >= LOG_LIMIT,
    perDay,
    classOptions: dir.classOptions,
    unknownCode: false,
  };
}

/** Số dòng nhật ký học sinh hiện có (để xem trước khi xóa). null = chưa có bảng. */
export async function studentLogCount(): Promise<number | null> {
  const { count, error } = await db().from("student_activity_log").select("id", { count: "exact", head: true });
  return error ? null : (count ?? 0);
}
