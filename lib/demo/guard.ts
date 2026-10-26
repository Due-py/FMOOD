import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { demoOn, demoRegistry } from "./server";
import { isDemoCode } from "./shared";

// CHỐT AN TOÀN của chế độ trình diễn.

export const DEMO_LOCKED =
  "Đang trình diễn nên phần này tạm khóa (nó sửa dữ liệu thật dùng chung cho mọi học sinh). Tắt trình diễn để sửa, hoặc dùng phần Dạy thử.";

/** Gọi đầu các thao tác sửa dữ liệu thật dùng chung (lời dặn, tài liệu, bài chung, lớp, tài khoản thầy cô). */
export async function blockInDemo(): Promise<{ ok: false; error: string } | null> {
  return (await demoOn()) ? { ok: false, error: DEMO_LOCKED } : null;
}

/** Lớp này là lớp mẫu (có trong sổ ghi tài khoản mẫu, hoặc mã bắt đầu bằng MAU-). Không gửi email, không cho đăng nhập. */
export async function isDemoClass(classId: string | null | undefined): Promise<boolean> {
  if (!classId) return false;
  const registry = await demoRegistry().catch(() => null);
  if (registry?.classIds.includes(classId)) return true;
  const { data } = await createAdminClient().from("classes").select("code").eq("id", classId).maybeSingle();
  return isDemoCode(data?.code);
}
