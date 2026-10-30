import "server-only";
import type { Profile } from "@/lib/auth";
import { helpInboxScope, type HelpRequest, type HelpStatus } from "@/lib/help-requests-shared";
import { classScope, inClassScope } from "@/lib/demo/server";
import { visibleClassIds } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";

// LỜI NHỜ GIÚP KHÔNG KHẨN (bảng help_requests, migration 0012). Đọc / ghi bằng quyền máy chủ,
// nên mọi hàm tự giới hạn theo người đang dùng (xem helpInboxScope).

// "*": các cột 3 ý, nhờ bạn đi cùng, đã xem chỉ có sau migration 0014; chưa chạy thì vẫn đọc được lời nhờ cũ
const COLS = "*, classes(name)";

/** Bảng chưa có (chưa chạy 0012): trang vẫn mở được, chỉ báo "chưa sẵn sàng". */
export function tableMissing(error: { code?: string } | null): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205" || error?.code === "42703";
}

function toRow(r: Record<string, unknown>): HelpRequest {
  const { classes, ...rest } = r;
  return { ...(rest as Omit<HelpRequest, "class_name">), class_name: (classes as { name: string } | null)?.name ?? null };
}

/** Hộp lời nhờ của thầy cô. ready = false khi chưa chạy 0012. */
export async function listHelpRequests(
  profile: Profile,
  { open = true, limit = 100 }: { open?: boolean; limit?: number } = {},
): Promise<{ ready: boolean; items: HelpRequest[] }> {
  const scope = helpInboxScope(profile.role, await visibleClassIds(profile));
  if (!scope) return { ready: true, items: [] };
  let query = createAdminClient()
    .from("help_requests")
    .select(COLS)
    .eq("to_role", scope.toRole)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (scope.classIds) query = query.in("class_id", scope.classIds);
  query = inClassScope(query, await classScope(profile));
  query = open ? query.neq("status", "done") : query.eq("status", "done");
  const { data, error } = await query;
  if (error) return { ready: !tableMissing(error), items: [] };
  return { ready: true, items: (data ?? []).map(toRow) };
}

/** Số lời nhờ chưa trả lời (cho thanh bên và trang Hôm nay). */
export async function countHelpWaiting(profile: Profile): Promise<number> {
  const scope = helpInboxScope(profile.role, await visibleClassIds(profile));
  if (!scope) return 0;
  let query = createAdminClient()
    .from("help_requests")
    .select("id", { count: "exact", head: true })
    .eq("to_role", scope.toRole)
    .eq("status", "new");
  if (scope.classIds) query = query.in("class_id", scope.classIds);
  const { count } = await inClassScope(query, await classScope(profile));
  return count ?? 0;
}

export async function getHelpRequest(id: string): Promise<HelpRequest | null> {
  const { data } = await createAdminClient().from("help_requests").select(COLS).eq("id", id).maybeSingle();
  return data ? toRow(data) : null;
}

/** Lời nhờ gần đây của chính học sinh (để thấy lời đáp ở trang chủ). */
export async function myHelpRequests(profile: Profile): Promise<HelpRequest[]> {
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const { data, error } = await createAdminClient()
    .from("help_requests")
    .select(COLS)
    .eq("student_id", profile.id)
    .neq("status", "done")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(3);
  if (error) return [];
  return (data ?? []).map(toRow);
}

export type HelpSnapshot = {
  status: HelpStatus;
  reply: string | null;
  replied_by: string | null;
  replied_by_name: string | null;
  replied_at: string | null;
};
export const HELP_SNAPSHOT_COLS = "status, reply, replied_by, replied_by_name, replied_at";

/**
 * Số lời đáp của thầy cô học sinh CHƯA đọc (thầy cô đã trả lời, học sinh chưa bấm "Mình đã đọc").
 * Dùng để hiện chấm báo trên thanh menu. Lỗi hay chưa có bảng thì coi như không có, không làm hỏng trang.
 */
export async function unreadHelpReplies(profile: Profile): Promise<number> {
  const { count, error } = await createAdminClient()
    .from("help_requests")
    .select("id", { count: "exact", head: true })
    .eq("student_id", profile.id)
    .eq("status", "replied");
  return error ? 0 : (count ?? 0);
}
