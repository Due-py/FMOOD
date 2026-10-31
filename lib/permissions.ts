import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { requireStaff, type Profile, type Role } from "@/lib/auth";
import { raterSlot } from "@/lib/bai-do-server";
import { getSetting } from "@/lib/settings";
import { canOpenPage, navFor, normalizeGrants, STAFF_PAGES, type Grants, type Viewer } from "@/lib/permissions-shared";
import type { NavGroup } from "@/lib/staff-nav";

// PHÂN QUYỀN THEO TRANG, PHẦN MÁY CHỦ (Bước 11). Phần quyết định nằm ở permissions-shared.ts (có test).
// Một hàm kiểm tra chung cho thanh bên, từng trang và từng thao tác:
//   trang:    const profile = await requirePage("/staff/alerts");
//   thao tác: const profile = await requirePage("/staff/alerts");            (bị chặn thì chuyển về /staff)
//             const profile = await requirePage("/staff/classes", ["admin"]); (giữ sàn vai trò khi cần)
// Bảng quyền đọc từ cài đặt "staff.pages" (giữ trong bộ nhớ 30 giây như mọi cài đặt; admin lưu thì có hiệu lực ngay
// trên máy chủ đó). Quyền trang KHÔNG thay kiểm tra dữ liệu: các hàm đọc dữ liệu vẫn tự lọc theo vai trò và lớp.

/** Bảng quyền đang dùng (đã áp ô khóa). */
export const pageGrants = cache(async (): Promise<Grants> => normalizeGrants((await getSetting("staff.pages")).grants));

export type PageAccess = { viewer: Viewer; grants: Grants; canOpen: (href: string) => boolean; nav: NavGroup[] };

/**
 * Quyền của người này trong request hiện tại. Chỉ hỏi bảng test_raters khi cần:
 * khi có trang mở cho Người chấm mà vai trò của người này chưa mở được.
 */
export const pageAccess = cache(async (profile: Profile): Promise<PageAccess> => {
  const grants = await pageGrants();
  const base: Viewer = { role: profile.role, rater: false };
  const needsRater =
    (profile.role === "teacher" || profile.role === "counselor") &&
    STAFF_PAGES.some((p) => grants[p.href]?.includes("rater") && !canOpenPage(grants, base, p.href));
  const viewer: Viewer = needsRater ? { ...base, rater: (await raterSlot(profile).catch(() => null)) !== null } : base;
  return { viewer, grants, canOpen: (href) => canOpenPage(grants, viewer, href), nav: navFor(grants, viewer) };
});

/**
 * Bắt buộc mở được ít nhất một trong các trang (thao tác dùng chung nhiều trang).
 * floor: giữ kiểm tra vai trò cũ ở chỗ mà bỏ đi sẽ mở rộng quyền dữ liệu.
 * Không được mở thì chuyển về trang Hôm nay (/staff), kể cả khi gọi thẳng thao tác.
 */
export async function requireAnyPage(hrefs: string[], floor?: readonly Role[]): Promise<Profile> {
  const profile = await requireStaff();
  if (floor && !floor.includes(profile.role)) redirect("/staff");
  const access = await pageAccess(profile);
  if (!hrefs.some((h) => access.canOpen(h))) redirect("/staff");
  return profile;
}

/** Bắt buộc mở được trang này (trang con dùng đường dẫn của trang cha trên thanh bên). */
export async function requirePage(href: string, floor?: readonly Role[]): Promise<Profile> {
  return requireAnyPage([href], floor);
}

/** Thanh bên / danh sách công cụ của người này. */
export async function staffNav(profile: Profile): Promise<NavGroup[]> {
  return (await pageAccess(profile)).nav;
}
