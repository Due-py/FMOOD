import "server-only";
import { addDays, dayKey, startOfDayIso } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

/** `emotions`: cảm xúc của LẦN GHI GẦN NHẤT trong ngày (không cộng dồn); `count`: số lần ghi trong ngày; `at`: giờ lần gần nhất. */
export type DayMood = { day: string; emotions: string[]; count: number; at: string };

/** Check-in của học sinh theo ngày (giờ VN), trong khoảng [from, to]; mỗi ngày tính theo lần ghi gần nhất. */
export async function getMoodByDay(userId: string, from: string, to: string): Promise<Map<string, DayMood>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("checkins")
    .select("emotions, created_at")
    .eq("user_id", userId)
    .gte("created_at", startOfDayIso(from))
    .lt("created_at", startOfDayIso(addDays(to, 1)))
    .order("created_at");

  const days = new Map<string, DayMood>();
  for (const row of data ?? []) {
    const day = dayKey(row.created_at);
    // đã sắp theo giờ tăng dần: lần sau ghi đè lần trước
    const cur = days.get(day);
    days.set(day, { day, emotions: row.emotions as string[], count: (cur?.count ?? 0) + 1, at: row.created_at as string });
  }
  return days;
}
