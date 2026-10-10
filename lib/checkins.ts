import "server-only";
import { addDays, dayKey, startOfDayIso } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export type DayMood = { day: string; emotions: string[]; count: number };

/** Check-in của học sinh, gom theo ngày (giờ VN), trong khoảng [from, to]. */
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
    const cur = days.get(day) ?? { day, emotions: [], count: 0 };
    cur.emotions.push(...(row.emotions as string[]));
    cur.count += 1;
    days.set(day, cur);
  }
  return days;
}
