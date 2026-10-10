import "server-only";
import { addDays, dayKey } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";


export type HabitView = {
  id: string;
  title: string;
  icon: string;
  doneToday: boolean;
  streak: number;
  best: number;
  /** từng có chuỗi nhưng đã đứt (không làm hôm qua lẫn hôm nay) */
  broken: boolean;
  /** 7 ngày gần nhất, cũ → mới */
  week: { day: string; done: boolean }[];
};

/**
 * Chuỗi hiện tại: số ngày liên tiếp tính tới hôm nay. Nếu hôm nay chưa làm
 * thì vẫn tính tới hôm qua (chuỗi chưa đứt cho tới hết ngày).
 */
export function computeStreak(days: Set<string>, today: string) {
  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  let best = 0;
  for (const d of days) {
    if (days.has(addDays(d, -1))) continue; // chỉ đếm từ ngày đầu chuỗi
    let len = 0;
    let c = d;
    while (days.has(c)) {
      len += 1;
      c = addDays(c, 1);
    }
    best = Math.max(best, len);
  }

  return { streak, best, broken: streak === 0 && days.size > 0 };
}

export async function getHabits(userId: string): Promise<HabitView[]> {
  const supabase = await createClient();
  const { data: habits } = await supabase
    .from("habits")
    .select("id, title, icon, habit_logs(day)")
    .eq("user_id", userId)
    .eq("archived", false)
    .order("created_at");

  const today = dayKey();
  return (habits ?? []).map((h) => {
    const days = new Set((h.habit_logs as { day: string }[]).map((l) => l.day));
    const { streak, best, broken } = computeStreak(days, today);
    return {
      id: h.id,
      title: h.title,
      icon: h.icon,
      doneToday: days.has(today),
      streak,
      best,
      broken,
      week: Array.from({ length: 7 }, (_, i) => {
        const day = addDays(today, i - 6);
        return { day, done: days.has(day) };
      }),
    };
  });
}
