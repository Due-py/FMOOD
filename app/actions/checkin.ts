"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { dominantGroup, isValidEmotion, MAX_EMOTIONS_PER_CHECKIN } from "@/lib/emotions";
import { checkinReply, type MascotMood } from "@/lib/mascot";
import { checkNegativeStreak } from "@/lib/safety/streak";
import { createClient } from "@/lib/supabase/server";

export type CheckinResult =
  | { ok: true; mood: MascotMood; reply: string; negative: boolean; teacherNotified: boolean }
  | { ok: false; error: string };

export async function saveCheckin(emotions: string[]): Promise<CheckinResult> {
  const profile = await requireProfile();

  const unique = [...new Set(emotions)].filter(isValidEmotion);
  if (unique.length === 0) return { ok: false, error: "Chọn ít nhất một cảm xúc nhé." };
  if (unique.length > MAX_EMOTIONS_PER_CHECKIN) {
    return { ok: false, error: `Chọn tối đa ${MAX_EMOTIONS_PER_CHECKIN} cảm xúc thôi nhé.` };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("checkins").insert({ user_id: profile.id, emotions: unique });
  if (error) {
    console.error("insert checkin failed", error);
    return { ok: false, error: "Chưa lưu được. Thử lại nhé." };
  }

  const group = dominantGroup(unique);
  const teacherNotified = group === "negative" ? await checkNegativeStreak(profile) : false;
  const { mood, line } = checkinReply(group);

  revalidatePath("/home");
  revalidatePath("/me");
  return { ok: true, mood, reply: line, negative: group === "negative", teacherNotified };
}
