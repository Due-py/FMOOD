import "server-only";
import { addDays, dayKey, startOfDayIso } from "@/lib/dates";
import { isNegative } from "@/lib/emotions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/auth";
import { createAlert } from "./alerts";

const DEFAULT_THRESHOLD = 5;

/** Số ngày liên tiếp (tính tới hôm nay) nặng lòng; mỗi ngày tính theo lần ghi tâm trạng gần nhất (lib/emotions.ts). */
export function negativeStreak(checkins: { emotions: string[]; created_at: string }[], today: string) {
  const byDay = new Map<string, { at: string; emotions: string[] }>();
  for (const c of checkins) {
    const key = dayKey(c.created_at);
    const cur = byDay.get(key);
    if (!cur || c.created_at > cur.at) byDay.set(key, { at: c.created_at, emotions: c.emotions });
  }
  let streak = 0;
  let day = today;
  // ngày không check-in làm đứt chuỗi
  while (byDay.has(day) && isNegative(byDay.get(day)!.emotions)) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}

/**
 * Sau mỗi check-in: nếu học sinh đã có N ngày liền cảm xúc nặng lòng
 * (N do lớp cài, mặc định 5) và chưa có cảnh báo cùng loại đang mở trong 7 ngày,
 * thì tạo cảnh báo cho thầy cô. Trả về true nếu vừa tạo cảnh báo.
 */
export async function checkNegativeStreak(profile: Profile): Promise<boolean> {
  const admin = createAdminClient();

  let threshold = DEFAULT_THRESHOLD;
  if (profile.class_id) {
    const { data } = await admin
      .from("classes")
      .select("negative_streak_days")
      .eq("id", profile.class_id)
      .maybeSingle();
    threshold = data?.negative_streak_days ?? DEFAULT_THRESHOLD;
  }

  const today = dayKey();
  const since = startOfDayIso(addDays(today, -(threshold - 1)));
  const { data: checkins } = await admin
    .from("checkins")
    .select("emotions, created_at")
    .eq("user_id", profile.id)
    .gte("created_at", since);

  const streak = negativeStreak(checkins ?? [], today);
  if (streak < threshold) return false;

  const { data: recent } = await admin
    .from("alerts")
    .select("id")
    .eq("student_id", profile.id)
    .eq("type", "negative_streak")
    .neq("status", "resolved")
    .gte("created_at", startOfDayIso(addDays(today, -6)))
    .limit(1);
  if (recent && recent.length > 0) return false;

  return createAlert({
    profile,
    type: "negative_streak",
    severity: "watch",
    reasons: [`${streak} ngày liên tiếp cảm xúc nặng lòng chiếm đa số`],
  });
}
