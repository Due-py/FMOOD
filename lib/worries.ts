import "server-only";
import type { Profile } from "@/lib/auth";
import { awardBadge, type BadgeKey } from "@/lib/badges";
import { dayKey } from "@/lib/dates";
import { createAlert } from "@/lib/safety/alerts";
import { checkMessage } from "@/lib/safety/check";
import type { RiskLevel } from "@/lib/safety/keywords";
import { createAdminClient } from "@/lib/supabase/admin";
import { contentForProfile } from "@/lib/support-content-server";
import {
  canAnswer,
  FEELINGS,
  followupNeedsAlert,
  isStale,
  LEVEL_LABELS,
  nextCheckAt,
  nextWorryState,
  validateWorry,
  type Feeling,
  type WorryInput,
  type WorryState,
  type WorryStatus,
} from "@/lib/worries-shared";

// CHUYỆN BẬN LÒNG (quyền server). Chỉ lưu khi học sinh tự bấm lưu.

export type SaveWorryResult =
  | { ok: true; worryId: string; risk: RiskLevel; firstTime: boolean }
  | { ok: false; error: string };

export async function saveWorry(profile: Profile, input: WorryInput, source: "checkin" | "chat"): Promise<SaveWorryResult> {
  const topics = await contentForProfile(profile, ["topic"]);
  const checked = validateWorry(input, new Set(topics.map((t) => t.topic as string)));
  if (!checked.ok) return checked;
  const { topic, level, note } = checked.value;

  // dòng học sinh tự gõ: kiểm tra an toàn giống trò chuyện, có dấu hiệu thì báo thầy cô
  let risk: RiskLevel = "none";
  if (note) {
    const safety = await checkMessage(note, []);
    risk = safety.level;
    if (risk !== "none") {
      await createAlert({
        profile,
        type: "chat_risk",
        severity: risk === "urgent" ? "urgent" : "watch",
        excerpt: `Chuyện bận lòng (${topic}): ${note}`,
        reasons: safety.reasons,
      });
    }
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("worries")
    .insert({
      user_id: profile.id,
      topic,
      note,
      level_start: level,
      level_now: level,
      next_check_at: nextCheckAt().toISOString(),
      source,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[F-Mood] Lưu chuyện bận lòng lỗi", error);
    return { ok: false, error: "Chưa lưu được. Thử lại nhé." };
  }
  await db.from("support_activity").insert({ user_id: profile.id, kind: "worry_saved", worry_id: data.id, day: dayKey() });
  const firstTime = await awardBadge(profile.id, "dam-ke");
  return { ok: true, worryId: data.id as string, risk, firstTime };
}

// ── Hỏi lại ──

export type WorryRow = {
  id: string;
  topic: string;
  note: string | null;
  level_start: number;
  level_now: number;
  status: WorryStatus;
  next_check_at: string | null;
  checks_count: number;
  source: "checkin" | "chat";
  created_at: string;
};
export const WORRY_COLS = "id, topic, note, level_start, level_now, status, next_check_at, checks_count, source, created_at";

const toState = (r: WorryRow): WorryState => ({
  status: r.status,
  levelStart: r.level_start,
  levelNow: r.level_now,
  checksCount: r.checks_count,
  nextCheckAt: r.next_check_at ? new Date(r.next_check_at) : null,
});

/**
 * Chuyện tới hạn hỏi lại sớm nhất (một thẻ mỗi lần). Chuyện tới hạn quá 14 ngày không ai trả lời
 * được chuyển sang "lâu không cập nhật" và thôi hiện thẻ. null khi không có (hoặc chưa chạy migration 0010).
 */
export async function dueWorry(userId: string, now: Date = new Date()): Promise<WorryRow | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("worries")
    .select(WORRY_COLS)
    .eq("user_id", userId)
    .eq("status", "open")
    .lte("next_check_at", now.toISOString())
    .order("next_check_at")
    .limit(20);
  if (error || !data) return null;
  const rows = data as WorryRow[];
  const stale = rows.filter((r) => isStale(toState(r), now)).map((r) => r.id);
  if (stale.length) {
    await db.from("worries").update({ status: "stale", updated_at: now.toISOString() }).in("id", stale).eq("user_id", userId);
  }
  return rows.find((r) => !stale.includes(r.id)) ?? null;
}

export type FollowupResult =
  | { ok: true; status: WorryStatus; levelStart: number; level: number; feeling: Feeling; badges: BadgeKey[]; alerted: boolean }
  | { ok: false; error: string };

/** Học sinh trả lời lời hỏi thăm (trên Trang chủ) hoặc tự cập nhật trong Hành trình. */
export async function answerFollowup(profile: Profile, worryId: string, level: number, feeling: string): Promise<FollowupResult> {
  if (!Number.isInteger(level) || level < 1 || level > 5) return { ok: false, error: "Chọn một đám mây gần đúng nhất nhé." };
  if (!(FEELINGS as readonly string[]).includes(feeling)) return { ok: false, error: "Chọn giờ bạn thấy thế nào nhé." };
  const answer = { level, feeling: feeling as Feeling };

  const db = createAdminClient();
  const { data: row } = await db.from("worries").select(WORRY_COLS).eq("id", worryId).eq("user_id", profile.id).maybeSingle();
  if (!row) return { ok: false, error: "Không tìm thấy chuyện này." };
  const worry = row as WorryRow;
  if (!canAnswer(worry.status)) return { ok: false, error: "Chuyện này đã khép lại rồi." };

  const now = new Date();
  const next = nextWorryState(toState(worry), answer, now);
  // so checks_count cũ để bấm hai lần không bị đếm hai lần
  const { data: updated, error } = await db
    .from("worries")
    .update({
      status: next.status,
      level_now: next.levelNow,
      checks_count: next.checksCount,
      next_check_at: next.nextCheckAt?.toISOString() ?? null,
      updated_at: now.toISOString(),
    })
    .eq("id", worry.id)
    .eq("user_id", profile.id)
    .eq("checks_count", worry.checks_count)
    .select("id");
  if (error || !updated?.length) {
    if (error) console.error("[F-Mood] Lưu lần hỏi lại lỗi", error);
    return { ok: false, error: "Chưa lưu được. Thử lại nhé." };
  }
  await Promise.all([
    db.from("worry_checks").insert({ worry_id: worry.id, user_id: profile.id, level, feeling: answer.feeling }),
    db.from("support_activity").insert({ user_id: profile.id, kind: "followup_answered", worry_id: worry.id, day: dayKey() }),
  ]);
  const alerted = followupNeedsAlert(answer);
  if (alerted) await alertWorse(profile, worry);
  const badges: BadgeKey[] = [];
  if (await awardBadge(profile.id, "quay-lai-hoi-tham")) badges.push("quay-lai-hoi-tham");
  if (next.levelDropped && (await awardBadge(profile.id, "nhe-long-hon"))) badges.push("nhe-long-hon");
  return { ok: true, status: next.status, levelStart: worry.level_start, level, feeling: answer.feeling, badges, alerted };
}

const WORSE_PREFIX = "Mây hỏi thăm";

/**
 * Học sinh thấy nặng hơn ở mức "Lo rất nhiều": báo thầy cô phụ trách (mức cần để ý, có email).
 * Chỉ ghi chủ đề và mức lo, KHÔNG kèm dòng học sinh tự viết. Trong 24 giờ chỉ báo một lần.
 */
async function alertWorse(profile: Profile, worry: WorryRow) {
  const db = createAdminClient();
  const { data: recent } = await db
    .from("alerts")
    .select("id")
    .eq("student_id", profile.id)
    .eq("type", "worry_worse")
    .neq("status", "resolved")
    .gte("created_at", new Date(Date.now() - 86_400_000).toISOString())
    .limit(1);
  if (recent?.length) return;
  const topic = (await contentForProfile(profile, ["topic"])).find((t) => t.topic === worry.topic);
  const label = topic ? String(topic.data.label) : "một chuyện";
  await createAlert({
    profile,
    type: "worry_worse",
    severity: "watch",
    excerpt:
      `${WORSE_PREFIX} chuyện "${label}": học sinh chọn "Nặng hơn", mức lo "${LEVEL_LABELS[4]}" ` +
      `(lúc kể: "${LEVEL_LABELS[worry.level_start - 1]}"). Không kèm chuyện học sinh kể.`,
    reasons: ["Học sinh tự đánh giá: nặng hơn, lo rất nhiều"],
  });
}

/** Học sinh xóa một chuyện bận lòng của mình (giọt nước và huy hiệu đã có vẫn giữ). */
export async function removeWorry(profile: Profile, worryId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await createAdminClient().from("worries").delete().eq("id", worryId).eq("user_id", profile.id);
  if (error) {
    console.error("[F-Mood] Xóa chuyện bận lòng lỗi", error);
    return { ok: false, error: "Chưa xóa được. Thử lại nhé." };
  }
  return { ok: true };
}
