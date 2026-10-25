import "server-only";
import { addDays, dayKey } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export type HabitView = {
  id: string;
  title: string;
  icon: string;
  doneToday: boolean;
  /** số ngày đã làm, cộng dồn (không có "chuỗi" để đứt, theo nguyên tắc không phạt) */
  daysDone: number;
  /** 7 ngày gần nhất, cũ → mới */
  week: { day: string; done: boolean }[];
};

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
    return {
      id: h.id,
      title: h.title,
      icon: h.icon,
      doneToday: days.has(today),
      daysDone: days.size,
      week: Array.from({ length: 7 }, (_, i) => {
        const day = addDays(today, i - 6);
        return { day, done: days.has(day) };
      }),
    };
  });
}

export type ArchivedHabit = { id: string; title: string; icon: string; daysDone: number };

/** Thói quen đã lưu trữ (xem lại và khôi phục được). */
export async function getArchivedHabits(userId: string): Promise<ArchivedHabit[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("habits")
    .select("id, title, icon, habit_logs(day)")
    .eq("user_id", userId)
    .eq("archived", true)
    .order("created_at");
  return (data ?? []).map((h) => ({
    id: h.id,
    title: h.title,
    icon: h.icon,
    daysDone: (h.habit_logs as { day: string }[]).length,
  }));
}
