import "server-only";
import type { LoopContent } from "@/app/(app)/checkin/WorryStep";
import type { Profile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { contentForProfile } from "@/lib/support-content-server";
import type { SupportItem } from "@/lib/support-content";
import { openersFor, pickActions, type Who } from "@/lib/support-picks";
import { supportDrops } from "@/lib/garden-drops";
import { dueWorry, WORRY_COLS, type WorryRow } from "@/lib/worries";
import type { Feeling, WorryStatus } from "@/lib/worries-shared";

// Gom nội dung vòng hỗ trợ cho từng màn hình (đã lọc theo trạng thái và lớp thử).

const text = (i: SupportItem) => String(i.data.text);

/** Huy hiệu hiện được, theo mã (bỏ tiền tố "badge."). */
function badgeMap(items: SupportItem[]): LoopContent["badges"] {
  return Object.fromEntries(
    items
      .filter((i) => i.kind === "badge")
      .map((i) => {
        const key = i.key.replace(/^badge\./, "");
        return [key, { key, name: String(i.data.name), emoji: String(i.data.emoji), description: String(i.data.description) }];
      }),
  );
}

/** Câu hỏi ở một bước: ưu tiên câu dùng chung, chọn ngẫu nhiên một câu. */
function pickAsk(items: SupportItem[], step: string): string | null {
  const asks = items.filter((i) => i.kind === "ask" && i.data.step === step && i.topic === null);
  return asks.length ? text(asks[Math.floor(Math.random() * asks.length)]) : null;
}

/** null khi chưa có chủ đề hoặc câu hỏi nào hiện được cho học sinh này (giữ màn hình check-in như cũ). */
export async function checkinLoop(profile: Profile): Promise<LoopContent | null> {
  const items = await contentForProfile(profile, ["topic", "ask", "may_line", "badge", "tiny_action", "opener"]);
  const topics = items
    .filter((i) => i.kind === "topic" && i.topic)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((i) => ({ key: i.topic as string, label: String(i.data.label), emoji: String(i.data.emoji) }));
  const askTopic = pickAsk(items, "checkin");
  const askLevel = pickAsk(items, "level");
  if (!topics.length || !askTopic || !askLevel) return null;

  return {
    topics,
    askTopic,
    askLevel,
    savedLines: items.filter((i) => i.kind === "may_line" && i.data.moment === "worry_saved").map(text),
    badges: badgeMap(items),
    hasSteps: items.some((i) => i.kind === "tiny_action" || i.kind === "opener"),
  };
}

export type ChatLoop = {
  topics: Record<string, { label: string; emoji: string }>;
  /** câu mở đầu theo chủ đề */
  starters: Record<string, string[]>;
  fillBlanks: string[];
  askLevel: string | null;
  savedLines: string[];
  badges: LoopContent["badges"];
  /** có việc nhỏ hoặc câu mở lời hiện được (để hiện lối sang trang Việc nhỏ) */
  hasSteps: boolean;
};

/** Nội dung vòng hỗ trợ cho trang trò chuyện. null khi chưa có chủ đề nào hiện được. */
export async function chatLoop(profile: Profile): Promise<ChatLoop | null> {
  const items = await contentForProfile(profile, ["topic", "starter", "fill_blank", "ask", "may_line", "badge", "tiny_action", "opener"]);
  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
  const topicItems = sorted.filter((i) => i.kind === "topic" && i.topic);
  if (!topicItems.length) return null;

  const starters: Record<string, string[]> = {};
  for (const i of sorted.filter((x) => x.kind === "starter" && x.topic)) (starters[i.topic as string] ??= []).push(text(i));
  return {
    topics: Object.fromEntries(topicItems.map((i) => [i.topic as string, { label: String(i.data.label), emoji: String(i.data.emoji) }])),
    starters,
    fillBlanks: sorted.filter((i) => i.kind === "fill_blank").map(text),
    askLevel: pickAsk(items, "level"),
    savedLines: sorted.filter((i) => i.kind === "may_line" && i.data.moment === "worry_saved").map(text),
    badges: badgeMap(items),
    hasSteps: items.some((i) => i.kind === "tiny_action" || i.kind === "opener"),
  };
}

export type StepAction = { key: string; title: string; minutes: number; steps: string[]; lessonSlug: string | null };
export type StepsLoop = {
  worry: { id: string; topic: string; label: string; emoji: string } | null;
  actions: StepAction[];
  openers: Record<Exclude<Who, "other">, string[]>;
  doneLines: string[];
  badges: LoopContent["badges"];
};

/**
 * Nội dung trang "Việc nhỏ" (thử một việc nhỏ + muốn kể với ai). Gắn với chuyện bận lòng nếu có
 * (chỉ khi đúng là của học sinh này). null khi chưa có việc nhỏ hay câu mở lời nào hiện được.
 */
export async function stepsLoop(profile: Profile, worryId: string | null): Promise<StepsLoop | null> {
  const items = await contentForProfile(profile, ["topic", "tiny_action", "opener", "may_line", "badge"]);
  let worry: StepsLoop["worry"] = null;
  if (worryId) {
    const { data } = await createAdminClient()
      .from("worries")
      .select("id, topic")
      .eq("id", worryId)
      .eq("user_id", profile.id)
      .maybeSingle();
    const topic = items.find((i) => i.kind === "topic" && i.topic === data?.topic);
    if (data && topic) worry = { id: data.id, topic: data.topic, label: String(topic.data.label), emoji: String(topic.data.emoji) };
  }
  const topic = worry?.topic ?? null;
  const actions = pickActions(items, topic).map((a) => ({
    key: a.key,
    title: String(a.data.title),
    minutes: Number(a.data.minutes),
    steps: a.data.steps as string[],
    lessonSlug: typeof a.data.lessonSlug === "string" ? a.data.lessonSlug : null,
  }));
  const openers = {
    parent: openersFor(items, "parent", topic),
    teacher: openersFor(items, "teacher", topic),
    friend: openersFor(items, "friend", topic),
  };
  if (!actions.length && !openers.parent.length && !openers.teacher.length && !openers.friend.length) return null;
  return {
    worry,
    actions,
    openers,
    doneLines: items.filter((i) => i.kind === "may_line" && i.data.moment === "action_done").map(text),
    badges: badgeMap(items),
  };
}

export type FollowupLines = Record<"followup_better" | "followup_same" | "followup_worse", string[]>;
export type FollowupWorry = { id: string; topic: string; label: string; emoji: string; levelStart: number; levelNow: number };

/** Chủ đề của một chuyện; chủ đề đã bị tắt thì vẫn hiện được bằng tên chung. */
function topicOf(items: SupportItem[], topic: string) {
  const t = items.find((i) => i.kind === "topic" && i.topic === topic);
  return t ? { label: String(t.data.label), emoji: String(t.data.emoji) } : { label: "Một chuyện", emoji: "☁️" };
}

const followupLines = (items: SupportItem[]): FollowupLines => {
  const of = (moment: keyof FollowupLines) => items.filter((i) => i.kind === "may_line" && i.data.moment === moment).map(text);
  return { followup_better: of("followup_better"), followup_same: of("followup_same"), followup_worse: of("followup_worse") };
};

const toFollowupWorry = (items: SupportItem[], w: WorryRow): FollowupWorry => ({
  id: w.id,
  topic: w.topic,
  ...topicOf(items, w.topic),
  levelStart: w.level_start,
  levelNow: w.level_now,
});

export type FollowupLoop = {
  worry: FollowupWorry;
  ask: string;
  lines: FollowupLines;
  badges: LoopContent["badges"];
  hasSteps: boolean;
};

/** Thẻ "Mây hỏi thăm" trên Trang chủ: chuyện tới hạn sớm nhất. null khi không có chuyện tới hạn hoặc chưa có nội dung. */
export async function followupLoop(profile: Profile): Promise<FollowupLoop | null> {
  const items = await contentForProfile(profile, ["topic", "ask", "may_line", "badge", "tiny_action", "opener"]);
  const general = items.filter((i) => i.kind === "ask" && i.data.step === "followup" && i.topic === null);
  if (!general.length) return null;
  const worry = await dueWorry(profile.id);
  if (!worry) return null;
  // ưu tiên câu hỏi theo đúng chủ đề
  const own = items.filter((i) => i.kind === "ask" && i.data.step === "followup" && i.topic === worry.topic);
  const pool = own.length ? own : general;
  return {
    worry: toFollowupWorry(items, worry),
    ask: text(pool[Math.floor(Math.random() * pool.length)]),
    lines: followupLines(items),
    badges: badgeMap(items),
    hasSteps: items.some((i) => i.kind === "tiny_action" || i.kind === "opener"),
  };
}

export type JourneyWorry = FollowupWorry & {
  note: string | null;
  status: WorryStatus;
  nextCheckAt: string | null;
  createdAt: string;
  checks: { level: number; feeling: Feeling; at: string }[];
};
export type JourneyBadge = LoopContent["badges"][string] & { how: string; earnedAt: string | null };
export type JourneyLoop = {
  worries: JourneyWorry[];
  actionsTried: { key: string; title: string; times: number }[];
  toldCount: number;
  badges: JourneyBadge[];
  drops: number;
  ask: string;
  lines: FollowupLines;
  badgeInfo: LoopContent["badges"];
  hasSteps: boolean;
};

/** Trang "Hành trình của mình". null khi chưa có chủ đề nào hiện được với học sinh này. */
export async function journeyLoop(profile: Profile): Promise<JourneyLoop | null> {
  const items = await contentForProfile(profile, ["topic", "ask", "may_line", "badge", "tiny_action", "opener"]);
  if (!items.some((i) => i.kind === "topic")) return null;
  const db = createAdminClient();
  await dueWorry(profile.id); // cập nhật "lâu không cập nhật" trước khi đọc
  const [worries, checks, activity, earned] = await Promise.all([
    db.from("worries").select(WORRY_COLS).eq("user_id", profile.id).order("created_at", { ascending: false }),
    db.from("worry_checks").select("worry_id, level, feeling, created_at").eq("user_id", profile.id).order("created_at"),
    db.from("support_activity").select("kind, ref, day").eq("user_id", profile.id),
    db.from("badges_earned").select("badge_key, earned_at").eq("user_id", profile.id),
  ]);

  const checksBy = new Map<string, JourneyWorry["checks"]>();
  for (const c of checks.data ?? []) {
    const list = checksBy.get(c.worry_id) ?? [];
    list.push({ level: c.level, feeling: c.feeling as Feeling, at: c.created_at });
    checksBy.set(c.worry_id, list);
  }

  const rows = (activity.data ?? []) as { kind: string; ref: string | null; day: string }[];
  const times = new Map<string, number>();
  for (const r of rows) if (r.kind === "tiny_action_done" && r.ref) times.set(r.ref, (times.get(r.ref) ?? 0) + 1);
  const actionTitles = new Map(items.filter((i) => i.kind === "tiny_action").map((i) => [i.key, String(i.data.title)]));

  const earnedAt = new Map((earned.data ?? []).map((e) => [e.badge_key as string, e.earned_at as string]));
  const badgeItems = items.filter((i) => i.kind === "badge").sort((a, b) => a.sortOrder - b.sortOrder);
  const general = items.filter((i) => i.kind === "ask" && i.data.step === "followup" && i.topic === null);

  return {
    worries: ((worries.data ?? []) as WorryRow[]).map((w) => ({
      ...toFollowupWorry(items, w),
      note: w.note,
      status: w.status,
      nextCheckAt: w.next_check_at,
      createdAt: w.created_at,
      checks: checksBy.get(w.id) ?? [],
    })),
    actionsTried: [...times]
      .filter(([key]) => actionTitles.has(key))
      .map(([key, n]) => ({ key, title: actionTitles.get(key) as string, times: n })),
    toldCount: rows.filter((r) => r.kind === "told").length,
    badges: badgeItems.map((i) => {
      const key = i.key.replace(/^badge\./, "");
      return {
        key,
        name: String(i.data.name),
        emoji: String(i.data.emoji),
        description: String(i.data.description),
        how: String(i.data.how),
        earnedAt: earnedAt.get(key) ?? null,
      };
    }),
    drops: supportDrops(rows),
    ask: general.length ? text(general[0]) : "Giờ bạn thấy chuyện này thế nào rồi?",
    lines: followupLines(items),
    badgeInfo: badgeMap(items),
    hasSteps: items.some((i) => i.kind === "tiny_action" || i.kind === "opener"),
  };
}
