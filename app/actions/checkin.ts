"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { dominantGroup, isUnsure, isValidEmotion, MAX_EMOTIONS_PER_CHECKIN, UNSURE } from "@/lib/emotions";
import { checkinReply, unsureReply, type MascotMood } from "@/lib/mascot";
import { awardBadge } from "@/lib/badges";
import { checkNegativeStreak } from "@/lib/safety/streak";
import { createAdminClient } from "@/lib/supabase/admin";

export type CheckinResult =
  | {
      ok: true;
      mood: MascotMood;
      reply: string;
      negative: boolean;
      /** học sinh chọn "Chưa rõ": trợ lý không mở bước kể chuyện bận lòng, không hỏi dồn */
      unsure: boolean;
      teacherNotified: boolean;
      /** lần check-in đầu tiên: vừa nhận huy hiệu "Gọi tên cảm xúc" */
      firstBadge: boolean;
    }
  | { ok: false; error: string };

export async function saveCheckin(emotions: string[]): Promise<CheckinResult> {
  const profile = await requireProfile();

  let unique = [...new Set(emotions)].filter(isValidEmotion);
  // "Chưa rõ" đứng riêng: chọn cùng cảm xúc khác thì chỉ giữ "Chưa rõ"
  if (isUnsure(unique)) unique = [UNSURE.id];
  if (unique.length === 0) return { ok: false, error: "Chọn ít nhất một cảm xúc nhé." };
  if (unique.length > MAX_EMOTIONS_PER_CHECKIN) {
    return { ok: false, error: `Chọn tối đa ${MAX_EMOTIONS_PER_CHECKIN} cảm xúc thôi nhé.` };
  }

  // ghi bằng quyền server: học sinh không tự chèn check-in (đổi ngày, bỏ qua bước báo thầy cô)
  const { error } = await createAdminClient().from("checkins").insert({ user_id: profile.id, emotions: unique });
  if (error) {
    console.error("insert checkin failed", error);
    return { ok: false, error: "Chưa lưu được. Thử lại nhé." };
  }
  // nhật ký đợt thử: chỉ ghi là đã ghi tâm trạng, không ghi cảm xúc đã chọn
  logActivity(profile, "checkin");

  const group = dominantGroup(unique);
  const [teacherNotified, firstBadge] = await Promise.all([
    group === "negative" ? checkNegativeStreak(profile) : Promise.resolve(false),
    awardBadge(profile.id, "goi-ten-cam-xuc"),
  ]);
  const unsure = isUnsure(unique);
  const { mood, line } = unsure ? unsureReply() : checkinReply(group);

  revalidatePath("/home");
  revalidatePath("/me");
  return { ok: true, mood, reply: line, negative: group === "negative", unsure, teacherNotified, firstBadge };
}
