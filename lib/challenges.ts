import "server-only";
import type { Profile } from "@/lib/auth";
import { challengeStats, isChallengeOpen } from "@/lib/class-tools";
import { dayKey } from "@/lib/dates";
import { tableMissing } from "@/lib/help-requests";
import { classScope, inClassScope } from "@/lib/demo/server";
import { allowsClass } from "@/lib/demo/shared";
import { createAdminClient } from "@/lib/supabase/admin";

// THỬ THÁCH CỦA LỚP (bảng challenges + habits.challenge_id, migration 0012).
// Giáo viên chỉ thấy số bạn tham gia và tổng lượt làm (ẩn khi dưới 5 bạn), không có tên.

export type Challenge = {
  id: string;
  class_id: string;
  class_name: string | null;
  title: string;
  icon: string;
  description: string;
  ends_on: string;
  status: "open" | "closed";
  author_id: string | null;
  author_name: string;
  created_at: string;
};

export type ChallengeWithStats = Challenge & { open: boolean; joined: number | null; doneTimes: number | null };

const COLS = "id, class_id, title, icon, description, ends_on, status, author_id, author_name, created_at, classes(name)";

function toChallenge(r: Record<string, unknown>): Challenge {
  const { classes, ...rest } = r;
  return { ...(rest as Omit<Challenge, "class_name">), class_name: (classes as { name: string } | null)?.name ?? null };
}

/** Thử thách của các lớp người này được xem, kèm số liệu gộp. ready = false khi chưa chạy 0012. */
export async function listChallenges(profile: Profile, classId?: string): Promise<{ ready: boolean; items: ChallengeWithStats[] }> {
  const scope = await classScope(profile);
  if (scope.kind === "only" && scope.ids.length === 0) return { ready: true, items: [] };
  if (classId && !allowsClass(scope, classId)) return { ready: true, items: [] };
  const db = createAdminClient();
  let query = inClassScope(db.from("challenges").select(COLS).order("created_at", { ascending: false }).limit(50), scope);
  if (classId) query = query.eq("class_id", classId);
  const { data, error } = await query;
  if (error) return { ready: !tableMissing(error), items: [] };
  const challenges = (data ?? []).map(toChallenge);
  if (!challenges.length) return { ready: true, items: [] };

  // ai tham gia: thói quen gắn với thử thách, của học sinh đang ở đúng lớp đó
  const { data: habits } = await db
    .from("habits")
    .select("id, user_id, challenge_id, profiles!inner(class_id)")
    .in(
      "challenge_id",
      challenges.map((c) => c.id),
    );
  const habitRows = (habits ?? []) as unknown as { id: string; user_id: string; challenge_id: string; profiles: { class_id: string | null } }[];
  const { data: logs } = habitRows.length
    ? await db.from("habit_logs").select("habit_id").in("habit_id", habitRows.map((h) => h.id))
    : { data: [] };
  const logCount = new Map<string, number>();
  for (const l of logs ?? []) logCount.set(l.habit_id, (logCount.get(l.habit_id) ?? 0) + 1);

  const today = dayKey();
  return {
    ready: true,
    items: challenges.map((c) => ({
      ...c,
      open: isChallengeOpen(c, today),
      ...challengeStats(
        habitRows
          .filter((h) => h.challenge_id === c.id && h.profiles.class_id === c.class_id)
          .map((h) => ({ userId: h.user_id, logs: logCount.get(h.id) ?? 0 })),
      ),
    })),
  };
}

export async function getChallenge(id: string): Promise<Challenge | null> {
  const { data } = await createAdminClient().from("challenges").select(COLS).eq("id", id).maybeSingle();
  return data ? toChallenge(data) : null;
}

/** Thử thách đang mở của lớp học sinh, và học sinh đã tham gia chưa. */
export async function challengesForStudent(profile: Profile): Promise<(Challenge & { joined: boolean })[]> {
  if (!profile.class_id) return [];
  const db = createAdminClient();
  const today = dayKey();
  const { data, error } = await db
    .from("challenges")
    .select(COLS)
    .eq("class_id", profile.class_id)
    .eq("status", "open")
    .gte("ends_on", today)
    .order("created_at", { ascending: false })
    .limit(3);
  if (error || !data?.length) return [];
  const { data: mine } = await db
    .from("habits")
    .select("challenge_id")
    .eq("user_id", profile.id)
    .eq("archived", false)
    .not("challenge_id", "is", null);
  const joined = new Set((mine ?? []).map((h) => h.challenge_id));
  return data.map(toChallenge).map((c) => ({ ...c, joined: joined.has(c.id) }));
}
