"use server";

import { revalidatePath } from "next/cache";
import { blockInDemo } from "@/lib/demo/guard";
import { pageGrants, requirePage } from "@/lib/permissions";
import {
  defaultGrants,
  describeChanges,
  isPermGroup,
  isStaffPage,
  PERM_GROUP_LABEL,
  PERMISSIONS_PAGE,
  setCell,
  STAFF_PAGES,
  type Grants,
} from "@/lib/permissions-shared";
import { audit, resetSetting, saveSetting } from "@/lib/settings";

// TRANG PHÂN QUYỀN (chỉ admin, Bước 11). Mỗi lần đổi một ô là một dòng nhật ký (loại "Phân quyền").
// Ô khóa không đổi được (setCell trả null); máy chủ cũng luôn áp lại ô khóa khi đọc bảng quyền.

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
  if (!after) return { ok: false, error: "Ô này bị khóa, không đổi được." };
  const changes = describeChanges(before, after);
  if (!changes.length) return { ok: true, grants: after };
  try {
    await saveSetting("staff.pages", { grants: after }, actor.nickname);
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

/** Khôi phục quyền mặc định (đúng như vai trò trong lib/staff-nav.ts). */
export async function resetPagePermissions(): Promise<Result<{ grants: Grants }>> {
  const actor = await requirePage(PERMISSIONS_PAGE);
  const demoLock = await blockInDemo();
  if (demoLock) return demoLock;
  const before = await pageGrants();
  const changes = describeChanges(before, defaultGrants());
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
  return { ok: true, grants: defaultGrants() };
}
