// CHẾ ĐỘ TRÌNH DIỄN: quy tắc dùng chung (hàm thuần, không đọc cơ sở dữ liệu, có test: shared.test.ts).
// Thiết kế: ho-so-du-thi/2-xay-dung/thiet-ke-2026-10-26-trinh-dien.md
//
// Dữ liệu mẫu được nhận ra bằng BA dấu hiệu cùng lúc, thiếu một là không coi là mẫu:
//  1. nằm trong sổ ghi tài khoản mẫu (app_settings "demo.registry"),
//  2. lớp có mã bắt đầu bằng "MAU-" (mã lớp thật do máy sinh không bao giờ có dấu "-"),
//  3. email đăng nhập có đuôi "@demo.fmood.invalid" (không ai nhận thư ở địa chỉ này).
import type { Role } from "@/lib/auth";

export const DEMO_CODE_PREFIX = "MAU-";
export const DEMO_EMAIL_DOMAIN = "demo.fmood.invalid";
export const DEMO_COOKIE = "fmood_trinh_dien";
export const DEMO_REGISTRY_KEY = "demo.registry";

/** Ghi chú gắn vào mọi đoạn trích cảnh báo mẫu: không có câu nguy hiểm thật nào. */
export const SIMULATED = "[Giả lập trình diễn · câu mẫu, không phải lời học sinh thật]";

export type DemoRegistry = {
  status: "creating" | "ready";
  createdAt: string;
  createdBy: string;
  classIds: string[];
  staffIds: string[];
  studentIds: string[];
  /** những bạn dùng để kể chuyện trong buổi trình diễn */
  showcase: { journey: string; a: string; b: string; teacher: string; counselor: string };
};

export const isDemoCode = (code: string | null | undefined) => (code ?? "").trim().toUpperCase().startsWith(DEMO_CODE_PREFIX);
export const demoEmail = (id: string) => `${id}@${DEMO_EMAIL_DOMAIN}`;
export const isDemoEmail = (email: string | null | undefined) => (email ?? "").toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`);

// ───────── Ai được thấy lớp nào ─────────

export type ClassScope = { kind: "only"; ids: string[] } | { kind: "except"; ids: string[] } | { kind: "all" };

/**
 * Phạm vi lớp của một người:
 *  - giáo viên: chỉ lớp mình chủ nhiệm
 *  - admin đang trình diễn: chỉ lớp mẫu
 *  - admin / phòng tham vấn bình thường: mọi lớp TRỪ lớp mẫu (chưa có lớp mẫu thì mọi lớp)
 */
export function classScopeFor(role: Role, opts: { demo: boolean; demoClassIds: string[]; ownClassIds: string[] }): ClassScope {
  if (role === "admin" && opts.demo) return { kind: "only", ids: opts.demoClassIds };
  if (role === "admin" || role === "counselor") return opts.demoClassIds.length ? { kind: "except", ids: opts.demoClassIds } : { kind: "all" };
  // GVCN mẫu chỉ chủ nhiệm lớp mẫu, GVCN thật không bao giờ chủ nhiệm lớp mẫu
  return { kind: "only", ids: role === "teacher" ? opts.ownClassIds : [] };
}

/** Dòng gắn với lớp này có nằm trong phạm vi không. Dòng không còn lớp (lớp đã xóa) chỉ hiện ở chế độ thường. */
export function allowsClass(scope: ClassScope, classId: string | null | undefined): boolean {
  if (scope.kind === "all") return true;
  if (scope.kind === "only") return Boolean(classId) && scope.ids.includes(classId as string);
  return !classId || !scope.ids.includes(classId);
}

/** Người này (học sinh / thầy cô) có nằm trong phạm vi không: đang trình diễn thì chỉ tài khoản mẫu, bình thường thì không bao giờ là tài khoản mẫu. */
export function allowsUser(demo: boolean, demoUserIds: ReadonlySet<string>, userId: string | null | undefined): boolean {
  if (!userId) return !demo;
  return demo ? demoUserIds.has(userId) : !demoUserIds.has(userId);
}

// ───────── Tua nhanh ─────────

/** Lý do không được tua (null = được). Chỉ tài khoản học sinh mẫu đủ cả ba dấu hiệu. */
export function timeTravelBlocked(
  registry: Pick<DemoRegistry, "studentIds" | "classIds"> | null,
  student: { id: string; role: string; classId: string | null; classCode: string | null; email: string | null },
): string | null {
  if (!registry) return "Chưa có dữ liệu mẫu.";
  if (student.role !== "student" || !registry.studentIds.includes(student.id)) return "Chỉ tua được tài khoản học sinh mẫu.";
  if (!student.classId || !registry.classIds.includes(student.classId) || !isDemoCode(student.classCode)) {
    return "Bạn này không ở lớp mẫu nên không tua được.";
  }
  if (!isDemoEmail(student.email)) return "Tài khoản này không phải tài khoản mẫu nên không tua được.";
  return null;
}

const DAY_MS = 86_400_000;

/** Dời một mốc thời gian (null giữ nguyên). days âm = lùi về quá khứ. */
export function shiftIso(iso: string | null, days: number): string | null {
  return iso === null ? null : new Date(Date.parse(iso) + days * DAY_MS).toISOString();
}

/** Dời một ngày "YYYY-MM-DD". */
export function shiftDay(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * "Tua nhanh N ngày" = dời mọi mốc thời gian của bạn ấy lùi N ngày, như thể N ngày đã trôi qua.
 * Hoàn tác = dời tới N ngày, CHỈ những dòng có trước lúc tua (dòng mới tạo sau khi tua giữ nguyên).
 */
export function shouldShiftBack(rowTime: string, tuaAt: string): boolean {
  return Date.parse(rowTime) < Date.parse(tuaAt);
}
