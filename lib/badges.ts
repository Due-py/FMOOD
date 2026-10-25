import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// HUY HIỆU DẤU MỐC: nhận một lần, không đếm, không mất. Tên / hình / mô tả nằm trong nội dung
// vòng hỗ trợ (cô Thúy duyệt); ở đây chỉ ghi học sinh đã đạt dấu mốc nào.

export const BADGE_KEYS = [
  "goi-ten-cam-xuc",
  "dam-ke",
  "thu-viec-nho",
  "quay-lai-hoi-tham",
  "nhe-long-hon",
  "cay-cau",
  "nguoi-lam-vuon",
] as const;
export type BadgeKey = (typeof BADGE_KEYS)[number];

const MISSING = new Set(["42P01", "PGRST205"]);

/** Trao huy hiệu. Trả về true nếu học sinh vừa nhận lần đầu. Chưa chạy migration 0010 thì bỏ qua. */
export async function awardBadge(userId: string, key: BadgeKey): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from("badges_earned")
    .upsert({ user_id: userId, badge_key: key }, { onConflict: "user_id,badge_key", ignoreDuplicates: true })
    .select("badge_key");
  if (error) {
    if (!MISSING.has(error.code)) console.error("[F-Mood] Trao huy hiệu lỗi", error);
    return false;
  }
  return (data?.length ?? 0) > 0;
}
