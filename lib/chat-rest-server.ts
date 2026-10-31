import "server-only";
import { dayKey, startOfDayIso } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/admin";
import { restStatus } from "./chat-rest";

// Thời gian trò chuyện hôm nay của một học sinh (mục 4.4), tính từ giờ gửi tin trong cơ sở dữ liệu (giờ Việt Nam).
// Lỗi thì coi như 0 phút: không nhắc, không làm phiền.

export async function chatRestToday(userId: string): Promise<{ minutes: number; remind: boolean; crossed: boolean }> {
  const none = { minutes: 0, remind: false, crossed: false };
  try {
    const { data, error } = await createAdminClient()
      .from("messages")
      .select("created_at, conversations!inner(user_id)")
      .eq("conversations.user_id", userId)
      .gte("created_at", startOfDayIso(dayKey()))
      .order("created_at")
      .limit(2000);
    if (error) return none;
    return restStatus((data ?? []).map((r) => r.created_at as string));
  } catch {
    return none;
  }
}
