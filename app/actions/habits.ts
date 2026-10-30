"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { dayKey } from "@/lib/dates";
import { isHabitIcon } from "@/lib/habit-icons";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

const habitSchema = z.object({
  title: z.string().trim().min(1, "Đặt tên cho thói quen nhé").max(60, "Tên thói quen tối đa 60 ký tự"),
  icon: z.string().trim().refine(isHabitIcon, "Chọn một biểu tượng (một emoji) nhé"),
});

const MAX_ACTIVE = 8;
const TOO_MANY = "Tập trung vào tối đa 8 thói quen thôi. Ít mà đều sẽ tốt hơn!";

async function atLimit(userId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("habits")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("archived", false);
  return (count ?? 0) >= MAX_ACTIVE;
}

function refresh() {
  revalidatePath("/habits");
  revalidatePath("/home");
}

export async function createHabit(input: { title: string; icon: string }): Promise<Result> {
  const profile = await requireProfile();
  const parsed = habitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  if (await atLimit(profile.id)) return { ok: false, error: TOO_MANY };

  const { error } = await supabase.from("habits").insert({ user_id: profile.id, ...parsed.data });
  if (error) return { ok: false, error: "Chưa lưu được. Thử lại nhé." };
  refresh();
  return { ok: true };
}

/** Đánh dấu / bỏ đánh dấu thói quen cho hôm nay (theo giờ Việt Nam). */
export async function toggleHabitToday(habitId: string, done: boolean): Promise<Result> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(habitId).success) return { ok: false, error: "Thói quen không hợp lệ." };
  const supabase = await createClient();
  const day = dayKey();

  // chỉ chạm được thói quen của chính mình; ghi bằng quyền server với ngày do máy chủ đặt
  // (học sinh không tự chèn ngày cũ để lấy điểm khu vườn)
  const { data: habit } = await supabase.from("habits").select("id").eq("id", habitId).eq("user_id", profile.id).maybeSingle();
  if (!habit) return { ok: false, error: "Không tìm thấy thói quen." };
  const { error } = done
    ? await createAdminClient().from("habit_logs").upsert({ habit_id: habitId, day }, { ignoreDuplicates: true })
    : await supabase.from("habit_logs").delete().eq("habit_id", habitId).eq("day", day);
  if (error) return { ok: false, error: "Chưa lưu được. Thử lại nhé." };
  refresh();
  return { ok: true };
}

/** Lưu trữ (archived = true) hoặc khôi phục một thói quen. Số ngày đã làm vẫn giữ nguyên. */
async function setArchived(habitId: string, archived: boolean): Promise<Result> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(habitId).success) return { ok: false, error: "Thói quen không hợp lệ." };
  if (!archived && (await atLimit(profile.id))) return { ok: false, error: TOO_MANY };
  const supabase = await createClient();
  const { error } = await supabase.from("habits").update({ archived }).eq("id", habitId).eq("user_id", profile.id);
  if (error) return { ok: false, error: "Chưa lưu được. Thử lại nhé." };
  refresh();
  return { ok: true };
}

export async function archiveHabit(habitId: string): Promise<Result> {
  return setArchived(habitId, true);
}

export async function restoreHabit(habitId: string): Promise<Result> {
  return setArchived(habitId, false);
}

/** Đổi biểu tượng của một thói quen của chính mình (chọn có sẵn hoặc tự gõ một emoji). */
export async function updateHabitIcon(habitId: string, icon: string): Promise<Result> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(habitId).success) return { ok: false, error: "Thói quen không hợp lệ." };
  const value = String(icon).trim();
  if (!isHabitIcon(value)) return { ok: false, error: "Chọn một biểu tượng (một emoji) nhé." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("habits").update({ icon: value }).eq("id", habitId).eq("user_id", profile.id).select("id");
  if (error || !data?.length) return { ok: false, error: "Chưa lưu được. Thử lại nhé." };
  refresh();
  return { ok: true };
}
