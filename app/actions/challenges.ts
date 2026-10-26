"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile, requireStaff } from "@/lib/auth";
import { getChallenge } from "@/lib/challenges";
import { challengeEndsOn, challengeSchema, isChallengeOpen } from "@/lib/class-tools";
import { dayKey } from "@/lib/dates";
import { canSeeClass } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// THỬ THÁCH CỦA LỚP: giáo viên chủ nhiệm (và admin) tạo / kết thúc; học sinh tự tham gia.

type Result = { ok: true } | { ok: false; error: string };
const FAILED = { ok: false as const, error: "Chưa lưu được. Thử lại nhé." };
const FORBIDDEN = { ok: false as const, error: "Thầy cô chỉ tạo thử thách cho lớp mình chủ nhiệm." };
const MAX_ACTIVE_HABITS = 8;

function refresh() {
  revalidatePath("/staff", "layout");
  revalidatePath("/home");
  revalidatePath("/habits");
}

export async function createChallenge(input: {
  classId: string;
  title: string;
  icon: string;
  description: string;
  weeks: number;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const profile = await requireStaff(["teacher", "admin"]);
  if (!z.uuid().safeParse(input.classId).success || !(await canSeeClass(profile, input.classId))) return FORBIDDEN;
  const parsed = challengeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { data, error } = await createAdminClient()
    .from("challenges")
    .insert({
      class_id: input.classId,
      author_id: profile.id,
      author_name: profile.nickname,
      title: parsed.data.title,
      icon: parsed.data.icon,
      description: parsed.data.description,
      ends_on: challengeEndsOn(dayKey(), parsed.data.weeks),
    })
    .select("id")
    .single();
  if (error) return FAILED;
  refresh();
  return { ok: true, id: data.id };
}

/** Kết thúc sớm (closed) hoặc mở lại (Hoàn tác). */
export async function setChallengeOpen(id: string, open: boolean): Promise<Result> {
  const profile = await requireStaff(["teacher", "admin"]);
  if (!z.uuid().safeParse(id).success) return FAILED;
  const c = await getChallenge(id);
  if (!c || !(await canSeeClass(profile, c.class_id))) return FORBIDDEN;
  const { error } = await createAdminClient()
    .from("challenges")
    .update({ status: open ? "open" : "closed" })
    .eq("id", id);
  if (error) return FAILED;
  refresh();
  return { ok: true };
}

/** Học sinh tham gia: thêm một thói quen gắn với thử thách (tính vào giới hạn 8 thói quen). */
export async function joinChallenge(id: string): Promise<Result> {
  const profile = await requireProfile();
  if (!z.uuid().safeParse(id).success) return FAILED;
  const c = await getChallenge(id);
  if (!c || c.class_id !== profile.class_id || !isChallengeOpen(c, dayKey())) {
    return { ok: false, error: "Thử thách này đã kết thúc rồi." };
  }
  const supabase = await createClient();
  const { data: mine } = await supabase.from("habits").select("challenge_id, archived").eq("user_id", profile.id);
  if (mine?.some((h) => h.challenge_id === id && !h.archived)) return { ok: true };
  if ((mine?.filter((h) => !h.archived).length ?? 0) >= MAX_ACTIVE_HABITS) {
    return { ok: false, error: "Bạn đang có 8 thói quen rồi. Lưu trữ bớt một thói quen để tham gia nhé." };
  }
  // ghi bằng quyền máy chủ: học sinh không tự gắn thói quen vào thử thách của lớp khác
  const { error } = await createAdminClient()
    .from("habits")
    .insert({ user_id: profile.id, title: c.title, icon: c.icon, challenge_id: c.id });
  if (error) return FAILED;
  refresh();
  return { ok: true };
}
