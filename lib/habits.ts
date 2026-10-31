import "server-only";
import { addDays, dayKey } from "@/lib/dates";
import { HISTORY_DAYS, type HabitDays } from "@/lib/habits-shared";
import { createClient } from "@/lib/supabase/server";

export type HabitView = HabitDays & {
  doneToday: boolean;
  /** số ngày đã làm, cộng dồn (không có "chuỗi" để đứt, theo nguyên tắc không phạt) */
  daysDone: number;
};

type Row = { id: string; title: string; icon: string; created_at: string; habit_logs: unknown };

function toView(h: Row, today: string): HabitView {
  const all = (h.habit_logs as { day: string }[]).map((l) => l.day);
  const from = addDays(today, -(HISTORY_DAYS - 1));
  const total = new Set(all).size;
  return {
    id: h.id,
    title: h.title,
    icon: h.icon,
    // ngày đã làm trước ngày tạo (dữ liệu cũ) thì coi như bắt đầu từ ngày làm sớm nhất
    startDay: [dayKey(h.created_at), ...all].sort()[0],
    today,
    done: [...new Set(all.filter((d) => d >= from && d <= today))].sort(),
    total,
    doneToday: all.includes(today),
    daysDone: total,
  };
}

export async function getHabits(userId: string): Promise<HabitView[]> {
  const supabase = await createClient();
  const { data: habits } = await supabase
    .from("habits")
    .select("id, title, icon, created_at, habit_logs(day)")
    .eq("user_id", userId)
    .eq("archived", false)
    .order("created_at");

  const today = dayKey();
  return (habits ?? []).map((h) => toView(h, today));
}

/** Một thói quen đang dùng của chính học sinh (cho "Nhìn lại cùng trợ lý"); không có thì null. */
export async function getHabit(userId: string, habitId: string): Promise<HabitView | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("habits")
    .select("id, title, icon, created_at, habit_logs(day)")
    .eq("id", habitId)
    .eq("user_id", userId)
    .eq("archived", false)
    .maybeSingle();
  return data ? toView(data, dayKey()) : null;
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
