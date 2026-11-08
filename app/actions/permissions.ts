"use server";

import { revalidatePath } from "next/cache";
import { blockInDemo } from "@/lib/demo/guard";
import { adminHiddenPages, pageGrants, requirePage } from "@/lib/permissions";
import {
  canHideFromAdmin,
  defaultGrants,
  describeChanges,
  isPermGroup,
  isStaffPage,
  PERM_GROUP_LABEL,
  PERMISSIONS_PAGE,
  setAdminHidden,
  setCell,
  STAFF_PAGES,
  type Grants,
} from "@/lib/permissions-shared";
import { audit, resetSetting, saveSetting } from "@/lib/settings";

// TRANG PHÂN QUYỀN (chỉ admin, Bước 11). Mỗi lần đổi một ô là một dòng nhật ký (loại "Phân quyền").
// Không còn ô khóa: admin chọn tự do cho GVCN, Tư vấn viên, Người chấm (setCell chỉ trả null khi trang / nhóm lạ).

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const FAILED = { ok: false as const, error: "Chưa lưu được. Thử lại nhé." };

function refresh() {
  // thanh bên của mọi trang thầy cô đổi theo
  revalidatePath("/staff", "layout");
}

/** Mở / bỏ một trang cho một nhóm. Trả về bảng quyền mới để giao diện vẽ lại. */
export async function setPagePermission(href: string, group: string, on: boolean): Promise<Result<{ grants: Grants }>> {
  const actor = await requirePage(PERMISSIONS_PAGE);
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  if (typeof href !== "string" || !isStaffPage(href) || !isPermGroup(group) || typeof on !== "boolean") return FAILED;
  const before = await pageGrants();
  const after = setCell(before, href, group, on);
  if (!after) return FAILED;
  const changes = describeChanges(before, after);
  if (!changes.length) return { ok: true, grants: after };
  try {
    await saveSetting("staff.pages", { grants: after, adminHidden: await adminHiddenPages() }, actor.nickname);
    await audit(actor, "Đổi phân quyền", changes.join("; "), {
      kind: "permission",
      page: PERMISSIONS_PAGE,
      targetType: "page",
      targetId: `${href} · ${PERM_GROUP_LABEL[group]}`,
    });
  } catch {
    return FAILED;
  }
  refresh();
  return { ok: true, grants: after };
}

/** Ẩn / hiện một trang trên thanh bên của admin. Không chặn đường dẫn: admin vẫn mở được trang đó. Trả về danh sách trang đang ẩn. */
export async function setAdminPageHidden(href: string, hidden: boolean): Promise<Result<{ hidden: string[] }>> {
  const actor = await requirePage(PERMISSIONS_PAGE);
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  if (typeof href !== "string" || typeof hidden !== "boolean" || !canHideFromAdmin(href)) return FAILED;
  const before = await adminHiddenPages();
  const after = setAdminHidden(before, href, hidden);
  if (!after) return FAILED;
  if (before.length === after.length && before.every((h) => after.includes(h))) return { ok: true, hidden: after };
  const label = STAFF_PAGES.find((p) => p.href === href)?.label ?? href;
  try {
    await saveSetting("staff.pages", { grants: await pageGrants(), adminHidden: after }, actor.nickname);
    await audit(actor, "Đổi phân quyền", `${label}: ${hidden ? "ẩn khỏi" : "hiện lại trên"} thanh bên của admin`, {
      kind: "permission",
      page: PERMISSIONS_PAGE,
      targetType: "page",
      targetId: `${href} · Admin`,
    });
  } catch {
    return FAILED;
  }
  refresh();
  return { ok: true, hidden: after };
}

/** Khôi phục quyền mặc định (đúng như vai trò trong lib/staff-nav.ts), cả trang admin đã ẩn. */
export async function resetPagePermissions(): Promise<Result<{ grants: Grants; hidden: string[] }>> {
  const actor = await requirePage(PERMISSIONS_PAGE);
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const before = await pageGrants();
  const hiddenBefore = await adminHiddenPages();
  const changes = [...describeChanges(before, defaultGrants()), ...(hiddenBefore.length ? [`hiện lại ${hiddenBefore.length} trang ẩn trên thanh bên của admin`] : [])];
  try {
    await resetSetting("staff.pages");
    await audit(
      actor,
      "Khôi phục phân quyền mặc định",
      changes.length ? changes.join("; ") : "Đang dùng mặc định, không có gì đổi",
      { kind: "permission", page: PERMISSIONS_PAGE, targetType: "page", targetId: `${STAFF_PAGES.length} trang` },
    );
  } catch {
    return FAILED;
  }
  refresh();
  return { ok: true, grants: defaultGrants(), hidden: [] };
}
