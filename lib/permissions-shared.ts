// PHÂN QUYỀN THEO TRANG: phần dùng chung (hàm thuần, không đọc cơ sở dữ liệu, có test: permissions.test.ts).
// Kế hoạch Demo 3, Bước 11. Admin chọn mỗi nhóm thành viên được mở những trang nào ở trang thầy cô.
//  - Admin luôn mở được mọi trang (không có cột admin trong bảng lưu, không bỏ tích được).
//  - "Người chấm" không phải vai trò: là giáo viên / tư vấn viên được giao chấm bài (bảng test_raters).
//    Quyền của một người = quyền nhóm theo vai trò + quyền nhóm Người chấm (nếu được giao).
//  - Mặc định lấy đúng vai trò ghi trong lib/staff-nav.ts, nên bật tính năng lên không đổi gì.
//  - Quyền trang KHÔNG mở rộng quyền dữ liệu: GVCN vẫn không đọc được nội dung tin nhắn, bài luyện, bài đo
//    (lib/staff-privacy.ts, lib/bai-do-server.ts và RLS vẫn chặn theo vai trò, dù được mở trang nào).
import type { Role } from "@/lib/auth";
import { NAV_GROUPS, type NavGroup, type NavItem } from "@/lib/staff-nav";

/** Nhóm thành viên có cột trong bảng phân quyền (admin luôn toàn quyền nên không có cột). */
export const PERM_GROUPS = ["teacher", "counselor", "rater"] as const;
export type PermGroup = (typeof PERM_GROUPS)[number];

export const PERM_GROUP_LABEL: Record<PermGroup, string> = {
  teacher: "GVCN",
  counselor: "Tư vấn viên",
  rater: "Người chấm",
};

export function isPermGroup(v: unknown): v is PermGroup {
  return typeof v === "string" && (PERM_GROUPS as readonly string[]).includes(v);
}

/** Trang chấm bài: trang duy nhất nhóm Người chấm được mở. */
export const GRADING_PAGE = "/staff/cham-bai";
/** Trang Phân quyền (chỉ admin). */
export const PERMISSIONS_PAGE = "/staff/phan-quyen";

/** Một dòng của bảng phân quyền: một trang ở thanh bên (đường dẫn trùng nhau gộp thành một dòng). */
export type StaffPage = {
  href: string;
  label: string;
  emoji: string;
  description: string;
  /** tên nhóm ở thanh bên */
  section: string;
  /** nhóm được mở theo mặc định (đúng như vai trò trong staff-nav.ts hiện nay) */
  defaults: PermGroup[];
};

function buildPages(): StaffPage[] {
  const byHref = new Map<string, StaffPage>();
  for (const g of NAV_GROUPS) {
    for (const item of g.items) {
      const groups = PERM_GROUPS.filter((p) => (p === "rater" ? item.href === GRADING_PAGE : item.roles.includes(p)));
      const page = byHref.get(item.href);
      if (!page) {
        byHref.set(item.href, { href: item.href, label: item.label, emoji: item.emoji, description: item.description, section: g.title, defaults: groups });
        continue;
      }
      // cùng một trang, hai tên cho hai vai trò (vd. "Câu hỏi cho lớp" của GVCN, "Phiếu khảo sát" của admin)
      page.label = `${page.label} / ${item.label}`;
      page.defaults = PERM_GROUPS.filter((p) => page.defaults.includes(p) || groups.includes(p));
    }
  }
  return [...byHref.values()];
}

/** Mọi trang có thể phân quyền, theo thứ tự thanh bên. */
export const STAFF_PAGES: StaffPage[] = buildPages();

const PAGE_BY_HREF = new Map(STAFF_PAGES.map((p) => [p.href, p]));

export function isStaffPage(href: string): boolean {
  return PAGE_BY_HREF.has(href);
}

/** Bảng phân quyền gom theo nhóm của thanh bên (cho trang Phân quyền). */
export function pageSections(): { title: string; pages: StaffPage[] }[] {
  const sections: { title: string; pages: StaffPage[] }[] = [];
  for (const p of STAFF_PAGES) {
    const last = sections.at(-1);
    if (last?.title === p.section) last.pages.push(p);
    else sections.push({ title: p.section, pages: [p] });
  }
  return sections;
}

/** Bảng quyền đã lưu: đường dẫn trang → các nhóm được mở. */
export type Grants = Record<string, PermGroup[]>;

export function defaultGrants(): Grants {
  return Object.fromEntries(STAFF_PAGES.map((p) => [p.href, [...p.defaults]]));
}

// ───────── Ô khóa: không tích / bỏ tích được, để quyền trang không vượt quyền dữ liệu ─────────

export type CellLock = { on: boolean; reason: string };

/** Trang chỉ admin mở được, kèm lý do hiện trên trang Phân quyền. */
const ADMIN_ONLY: Record<string, string> = {
  "/staff/members": "Chỉ admin: tạo, khóa tài khoản, đặt lại mật khẩu",
  [PERMISSIONS_PAGE]: "Chỉ admin: đổi quyền của mọi người",
  "/staff/nhat-ky": "Chỉ admin: nhật ký ghi hoạt động của từng người",
  "/staff/tong-quan": "Chỉ admin: số liệu hoạt động của cả app",
  "/staff/trinh-dien": "Chỉ admin: chế độ trình diễn chỉ chạy với tài khoản admin",
};

/** Ô này có bị khóa không (on = luôn tích / luôn bỏ tích); null = admin tự chọn được. */
export function cellLock(href: string, group: PermGroup): CellLock | null {
  if (Object.hasOwn(ADMIN_ONLY, href)) return { on: false, reason: ADMIN_ONLY[href] };
  if (group === "rater") {
    return href === GRADING_PAGE
      ? { on: true, reason: "Người chấm luôn mở được trang chấm bài" }
      : { on: false, reason: "Người chấm chỉ mở được trang chấm bài" };
  }
  if (href === "/staff/alerts" && group === "counselor") return { on: true, reason: "Luôn có tư vấn viên nhận và xử lý cảnh báo" };
  if (href === "/staff/surveys" && group === "counselor")
    return { on: false, reason: "Trang này chỉ có dạng cho GVCN (lớp mình) và cho admin (mọi phiếu)" };
  return null;
}

/**
 * Bảng quyền đọc từ cài đặt → bảng quyền dùng được: đủ mọi trang (trang mới thêm vào mã lấy mặc định),
 * bỏ trang / nhóm lạ, và luôn áp ô khóa (kể cả khi dữ liệu lưu bị sửa tay).
 */
export function normalizeGrants(stored: unknown): Grants {
  const raw = stored && typeof stored === "object" && !Array.isArray(stored) ? (stored as Record<string, unknown>) : {};
  const out: Grants = {};
  for (const p of STAFF_PAGES) {
    const saved = Object.hasOwn(raw, p.href) && Array.isArray(raw[p.href]) ? (raw[p.href] as unknown[]) : null;
    const chosen = saved ? saved.filter(isPermGroup) : p.defaults;
    out[p.href] = PERM_GROUPS.filter((g) => {
      const lock = cellLock(p.href, g);
      return lock ? lock.on : chosen.includes(g);
    });
  }
  return out;
}

// ───────── Kiểm tra quyền ─────────

/** Người đang xem: vai trò và có được giao chấm bài không. */
export type Viewer = { role: Role; rater: boolean };

/** Các nhóm (cột) mà người này thuộc về. Admin, học sinh: không thuộc cột nào. */
export function viewerGroups(viewer: Viewer): PermGroup[] {
  const groups: PermGroup[] = [];
  if (viewer.role === "teacher" || viewer.role === "counselor") {
    groups.push(viewer.role);
    if (viewer.rater) groups.push("rater");
  }
  return groups;
}

/**
 * Người này mở được trang này không. Admin: mọi trang. Học sinh: không trang nào.
 * Trang không có trong danh sách (gõ sai đường dẫn khi gọi): chỉ admin, để quên khai báo thì chặn chứ không mở.
 */
export function canOpenPage(grants: Grants, viewer: Viewer, href: string): boolean {
  if (viewer.role === "admin") return true;
  if (!isStaffPage(href)) return false;
  const allowed = grants[href] ?? [];
  return viewerGroups(viewer).some((g) => allowed.includes(g));
}

/**
 * Kiểm tra chung cho trang và thao tác: mở được ít nhất một trong các trang, và (nếu có) vai trò nằm trong "sàn".
 * Sàn giữ kiểm tra vai trò cũ ở những thao tác mà bỏ đi sẽ mở rộng quyền dữ liệu (vd. chỉ người chấm mới chấm bài).
 */
export function allowsPage(grants: Grants, viewer: Viewer, hrefs: string[], floor?: readonly Role[]): boolean {
  if (floor && !floor.includes(viewer.role)) return false;
  return hrefs.some((h) => canOpenPage(grants, viewer, h));
}

/**
 * Thanh bên của người này: chỉ trang được mở. Một trang có hai tên (vd. /staff/surveys)
 * thì hiện tên của vai trò mình, không có thì tên đầu tiên.
 */
export function navFor(grants: Grants, viewer: Viewer): NavGroup[] {
  const chosen = new Map<string, NavItem>();
  for (const item of NAV_GROUPS.flatMap((g) => g.items)) {
    const current = chosen.get(item.href);
    if (!current || (!current.roles.includes(viewer.role) && item.roles.includes(viewer.role))) chosen.set(item.href, item);
  }
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => chosen.get(i.href) === i && canOpenPage(grants, viewer, i.href)),
  })).filter((g) => g.items.length > 0);
}

// ───────── Đổi quyền (trang Phân quyền) ─────────

/** Đổi một ô. null khi trang lạ hoặc ô bị khóa. */
export function setCell(grants: Grants, href: string, group: PermGroup, on: boolean): Grants | null {
  if (!isStaffPage(href) || !isPermGroup(group) || cellLock(href, group)) return null;
  const current = normalizeGrants(grants);
  const next = new Set(current[href]);
  if (on) next.add(group);
  else next.delete(group);
  return { ...current, [href]: PERM_GROUPS.filter((g) => next.has(g)) };
}

/** Các thay đổi giữa hai bảng quyền, mỗi dòng một câu (ghi nhật ký). */
export function describeChanges(before: Grants, after: Grants): string[] {
  const a = normalizeGrants(before);
  const b = normalizeGrants(after);
  const lines: string[] = [];
  for (const p of STAFF_PAGES) {
    for (const g of PERM_GROUPS) {
      const was = a[p.href].includes(g);
      const now = b[p.href].includes(g);
      if (was !== now) lines.push(`${p.label}: ${now ? "mở cho" : "bỏ"} ${PERM_GROUP_LABEL[g]}`);
    }
  }
  return lines;
}

/** Bảng quyền có khác mặc định không. */
export function differsFromDefault(grants: Grants): boolean {
  return describeChanges(defaultGrants(), grants).length > 0;
}
