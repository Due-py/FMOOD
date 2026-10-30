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
  cleanDifficulty,
  FEELINGS,
  followupNeedsAlert,
  isStale,
  LEVEL_LABELS,
  nextCheckAt,
  nextWorryState,
  isTried,
  validateWorry,
  type DifficultySource,
  type Feeling,
  type RevisionAction,
  type Tried,
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
  | { ok: true; status: WorryStatus; levelStart: number; level: number; feeling: Feeling; tried: Tried | null; badges: BadgeKey[]; alerted: boolean }
  | { ok: false; error: string };

/** Chưa chạy migration 0014: bảng / cột mới chưa có. */
export function missingSchema(error: { code?: string } | null): boolean {
  return ["42P01", "42703", "PGRST204", "PGRST205"].includes(error?.code ?? "");
}

/**
 * Học sinh trả lời lời hỏi thăm (trên Trang chủ) hoặc tự cập nhật trong Hành trình.
 * `tried`: đã thử việc nhỏ chưa (chưa thử / thử rồi chưa đỡ / có ích); để trống nếu học sinh không trả lời.
 * Chưa thử thì KHÔNG tính là thử rồi mà không được (lưu riêng từng trường hợp).
 */
export async function answerFollowup(
  profile: Profile,
  worryId: string,
  level: number,
  feeling: string,
  triedInput: string | null = null,
  triedAction: string | null = null,
): Promise<FollowupResult> {
  if (!Number.isInteger(level) || level < 1 || level > 5) return { ok: false, error: "Chọn một đám mây gần đúng nhất nhé." };
  if (!(FEELINGS as readonly string[]).includes(feeling)) return { ok: false, error: "Chọn giờ bạn thấy thế nào nhé." };
  const tried = isTried(triedInput) ? triedInput : null;
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
  const check = { worry_id: worry.id, user_id: profile.id, level, feeling: answer.feeling };
  // việc vừa nhìn lại: chỉ nhận mã việc nhỏ đã làm cho đúng chuyện này
  const action = tried && tried !== "not_yet" && triedAction ? await doneActionFor(profile.id, worry.id, triedAction) : null;
  const saveCheck = async () => {
    const { error: e } = await db.from("worry_checks").insert({ ...check, tried, tried_action: action });
    // chưa chạy 0014: vẫn lưu lần hỏi lại, chỉ thiếu phần "đã thử chưa"
    if (missingSchema(e)) await db.from("worry_checks").insert(check);
  };
  await Promise.all([
    saveCheck(),
    db.from("support_activity").insert({ user_id: profile.id, kind: "followup_answered", worry_id: worry.id, day: dayKey() }),
  ]);
  const alerted = followupNeedsAlert(answer);
  if (alerted) await alertWorse(profile, worry);
  const badges: BadgeKey[] = [];
  if (await awardBadge(profile.id, "quay-lai-hoi-tham")) badges.push("quay-lai-hoi-tham");
  if (next.levelDropped && (await awardBadge(profile.id, "nhe-long-hon"))) badges.push("nhe-long-hon");
  return { ok: true, status: next.status, levelStart: worry.level_start, level, feeling: answer.feeling, tried, badges, alerted };
}

/** Mã việc nhỏ nếu học sinh đã đánh dấu làm việc đó cho chuyện này, không thì null. */
async function doneActionFor(userId: string, worryId: string, actionKey: string): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("support_activity")
    .select("ref")
    .eq("user_id", userId)
    .eq("worry_id", worryId)
    .eq("kind", "tiny_action_done")
    .eq("ref", actionKey)
    .limit(1);
  return data?.length ? actionKey : null;
}

/** Việc nhỏ học sinh đã làm cho chuyện này, mới nhất trước (mã, không trùng). */
export async function actionsDoneFor(userId: string, worryId: string): Promise<string[]> {
  const { data } = await createAdminClient()
    .from("support_activity")
    .select("ref, created_at")
    .eq("user_id", userId)
    .eq("worry_id", worryId)
    .eq("kind", "tiny_action_done")
    .order("created_at", { ascending: false });
  return [...new Set((data ?? []).map((r) => r.ref as string | null).filter((x): x is string => Boolean(x)))];
}

// ── Khó khăn đã xác nhận ──

export type Revision = { text: string; action: RevisionAction; source: DifficultySource; at: string };

/** Khó khăn đã xác nhận của các chuyện (trống khi chưa chạy 0014). */
export async function difficultiesOf(userId: string, worryIds: string[]): Promise<Map<string, string>> {
  if (!worryIds.length) return new Map();
  const { data, error } = await createAdminClient().from("worries").select("id, difficulty").eq("user_id", userId).in("id", worryIds);
  if (error) {
    if (!missingSchema(error)) console.error("[F-Mood] Đọc khó khăn đã xác nhận lỗi", error.message);
    return new Map();
  }
  return new Map((data ?? []).filter((r) => r.difficulty).map((r) => [r.id as string, r.difficulty as string]));
}

/** Lịch sử xác nhận / sửa của các chuyện, cũ trước mới sau. */
export async function revisionsOf(userId: string, worryIds: string[]): Promise<Map<string, Revision[]>> {
  const out = new Map<string, Revision[]>();
  if (!worryIds.length) return out;
  const { data, error } = await createAdminClient()
    .from("worry_revisions")
    .select("worry_id, text, action, source, created_at")
    .eq("user_id", userId)
    .in("worry_id", worryIds)
    .order("created_at");
  if (error) return out;
  for (const r of data ?? []) {
    const list = out.get(r.worry_id) ?? [];
    list.push({ text: r.text, action: r.action, source: r.source, at: r.created_at });
    out.set(r.worry_id, list);
  }
  return out;
}

/** Việc nhỏ học sinh đã báo "thử rồi mà chưa đỡ" cho chuyện này (để Mây không gợi ý lại). */
export async function unhelpfulActions(userId: string, worryId: string): Promise<string[]> {
  const { data, error } = await createAdminClient()
    .from("worry_checks")
    .select("tried_action")
    .eq("user_id", userId)
    .eq("worry_id", worryId)
    .eq("tried", "no_help");
  if (error) return [];
  return [...new Set((data ?? []).map((r) => r.tried_action as string | null).filter((x): x is string => Boolean(x)))];
}

/** Lần hỏi lại gần nhất có trả lời "đã thử chưa" của chuyện này (để Mây biết việc đã thử có ích không). */
export async function lastTried(userId: string, worryId: string): Promise<{ tried: Tried; action: string | null } | null> {
  const { data, error } = await createAdminClient()
    .from("worry_checks")
    .select("tried, tried_action")
    .eq("user_id", userId)
    .eq("worry_id", worryId)
    .not("tried", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error || !data?.length) return null;
  return { tried: data[0].tried as Tried, action: (data[0].tried_action as string | null) ?? null };
}

export type DifficultyResult = { ok: true; risk: RiskLevel } | { ok: false; error: string };

/**
 * Học sinh bấm "Đúng rồi" (confirmed) hoặc "Chưa đúng" (rejected) với một câu tóm tắt khó khăn.
 * Đúng rồi: câu này thành "khó khăn đã xác nhận" của chuyện. Cả hai đều lưu vào lịch sử sửa.
 * `ownWords`: học sinh tự viết / tự sửa / bấm chọn câu, nên kiểm tra an toàn như tin nhắn
 * (câu Mây tóm tắt từ tin nhắn đã được kiểm tra rồi thì không kiểm tra lại, để không báo trùng).
 */
export async function recordDifficulty(
  profile: Profile,
  worryId: string,
  text: string,
  source: DifficultySource,
  action: RevisionAction,
  ownWords: boolean,
): Promise<DifficultyResult> {
  const checked = cleanDifficulty(text);
  if (!checked.ok) return checked;
  const value = checked.value;
  const db = createAdminClient();
  const { data: row } = await db.from("worries").select("id, topic").eq("id", worryId).eq("user_id", profile.id).maybeSingle();
  if (!row) return { ok: false, error: "Không tìm thấy chuyện này." };

  let risk: RiskLevel = "none";
  if (ownWords && action === "confirmed") {
    const safety = await checkMessage(value, []);
    risk = safety.level;
    if (risk !== "none") {
      await createAlert({
        profile,
        type: "chat_risk",
        severity: risk === "urgent" ? "urgent" : "watch",
        excerpt: `Khó khăn học sinh xác nhận (${row.topic}): ${value}`,
        reasons: safety.reasons,
      });
    }
  }

  const now = new Date().toISOString();
  if (action === "confirmed") {
    const { error } = await db
      .from("worries")
      .update({ difficulty: value, difficulty_at: now, updated_at: now })
      .eq("id", worryId)
      .eq("user_id", profile.id);
    if (error) {
      if (!missingSchema(error)) console.error("[F-Mood] Lưu khó khăn đã xác nhận lỗi", error.message);
      return { ok: false, error: missingSchema(error) ? "Phần này chưa mở. Bạn cứ kể tiếp với Mây nhé." : "Chưa lưu được. Thử lại nhé." };
    }
  }
  const { error: revError } = await db.from("worry_revisions").insert({ worry_id: worryId, user_id: profile.id, text: value, action, source });
  if (revError && !missingSchema(revError)) console.error("[F-Mood] Lưu lịch sử sửa lỗi", revError.message);
  if (action === "confirmed") {
    await db.from("support_activity").insert({ user_id: profile.id, kind: "difficulty_confirmed", worry_id: worryId, day: dayKey() });
  }
  return { ok: true, risk };
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
