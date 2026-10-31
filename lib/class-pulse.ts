import "server-only";
import type { Profile } from "@/lib/auth";
import { commonWorries, weekPulse, type WeekPulse } from "@/lib/class-tools";
import { addDays, dayKey, startOfDayIso } from "@/lib/dates";
import { getEmotion, latestPerDay, type EmotionGroup } from "@/lib/emotions";
import { canSeeClass } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { allContent } from "@/lib/support-content-server";

// NHỊP CẢM XÚC CỦA LỚP cho giáo viên: chỉ số liệu gộp, dưới 5 bạn thì ẩn (xem class-tools.ts).
// Không đọc ghi chú hay nội dung chuyện bận lòng, chỉ chủ đề.

export type ClassPulse = {
  pulse: WeekPulse;
  worries: { shown: { topic: string; label: string; students: number }[]; hiddenTopics: number; ready: boolean };
};

export async function classPulse(profile: Profile, classId: string): Promise<ClassPulse | null> {
  if (!(await canSeeClass(profile, classId))) return null;
  const db = createAdminClient();
  const today = dayKey();
  const [checkins, worries, content] = await Promise.all([
    db
      .from("checkins")
      .select("user_id, emotions, created_at, profiles!inner(class_id)")
      .eq("profiles.class_id", classId)
      .gte("created_at", startOfDayIso(addDays(today, -13))),
    db
      .from("worries")
      .select("user_id, topic, profiles!inner(class_id)")
      .eq("profiles.class_id", classId)
      .gte("created_at", startOfDayIso(addDays(today, -29))),
    allContent(),
  ]);

  // mỗi bạn mỗi ngày tính lần ghi gần nhất (lib/emotions.ts)
  const rows = latestPerDay(checkins.data ?? [], (r) => r.user_id as string, (r) => r.created_at as string, dayKey).map((r) => ({
    user_id: r.user_id as string,
    day: dayKey(r.created_at as string),
    groups: ((r.emotions as string[]) ?? []).map((id) => getEmotion(id)?.group).filter((g): g is EmotionGroup => Boolean(g)),
  }));
  const labels = new Map(content.items.filter((i) => i.kind === "topic" && i.topic).map((i) => [i.topic as string, String(i.data.label)]));
  const common = commonWorries((worries.data ?? []).map((w) => ({ user_id: w.user_id as string, topic: w.topic as string })));

  return {
    pulse: weekPulse(rows, today),
    worries: {
      ready: !worries.error,
      hiddenTopics: common.hiddenTopics,
      shown: common.shown.map((t) => ({ ...t, label: labels.get(t.topic) ?? t.topic })),
    },
  };
}
