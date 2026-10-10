"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { dayKey } from "@/lib/dates";
import { HABIT_ICONS } from "@/lib/habit-icons";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

const habitSchema = z.object({
  title: z.string().trim().min(1, "Đặt tên cho thói quen nhé").max(60, "Tên thói quen tối đa 60 ký tự"),
  icon: z.string().refine((s) => HABIT_ICONS.includes(s)),
});

function refresh() {
  revalidatePath("/habits");
  revalidatePath("/home");
}

export async function createHabit(input: { title: string; icon: string }): Promise<Result> {
  const profile = await requireProfile();
  const parsed = habitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { count } = await supabase
    .from("habits")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("archived", false);
  if ((count ?? 0) >= 8) {
    return { ok: false, error: "Tập trung vào tối đa 8 thói quen thôi. Ít mà đều sẽ tốt hơn!" };
  }

  const { error } = await supabase.from("habits").insert({ user_id: profile.id, ...parsed.data });
  if (error) return { ok: false, error: "Chưa lưu được. Thử lại nhé." };
  refresh();
  return { ok: true };
}

/** Đánh dấu / bỏ đánh dấu thói quen cho hôm nay (theo giờ Việt Nam). */
export async function toggleHabitToday(habitId: string, done: boolean): Promise<Result> {
  await requireProfile();
  const supabase = await createClient();
  const day = dayKey();

  // RLS bảo đảm học sinh chỉ chạm được thói quen của chính mình
  const { error } = done
    ? await supabase.from("habit_logs").upsert({ habit_id: habitId, day }, { ignoreDuplicates: true })
    : await supabase.from("habit_logs").delete().eq("habit_id", habitId).eq("day", day);
  if (error) return { ok: false, error: "Chưa lưu được. Thử lại nhé." };
  refresh();
  return { ok: true };
}

export async function archiveHabit(habitId: string): Promise<Result> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("habits")
    .update({ archived: true })
    .eq("id", habitId)
    .eq("user_id", profile.id);
  if (error) return { ok: false, error: "Chưa lưu được. Thử lại nhé." };
  refresh();
  return { ok: true };
}
