import "server-only";
import type { LoopContent } from "@/app/(app)/checkin/WorryStep";
import type { Profile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { contentForProfile } from "@/lib/support-content-server";
import type { SupportItem } from "@/lib/support-content";
import { cueHits, openersFor, pickActions, type Who } from "@/lib/support-picks";
import { supportDrops } from "@/lib/garden-drops";
import { actionsDoneFor, difficultiesOf, dueWorry, revisionsOf, unhelpfulActions, WORRY_COLS, type Revision, type WorryRow } from "@/lib/worries";
import { followupWaitingDays, type Feeling, type Tried, type WorryStatus } from "@/lib/worries-shared";

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

/** Khó khăn hay gặp của một chủ đề (bấm chọn thay vì tự viết). */
const difficultiesOfTopic = (i: SupportItem): string[] => (Array.isArray(i.data.difficulties) ? (i.data.difficulties as string[]) : []);

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
    .map((i) => ({ key: i.topic as string, label: String(i.data.label), emoji: String(i.data.emoji), difficulties: difficultiesOfTopic(i) }));
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
  topics: Record<string, { label: string; emoji: string; difficulties: string[] }>;
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
    topics: Object.fromEntries(
      topicItems.map((i) => [i.topic as string, { label: String(i.data.label), emoji: String(i.data.emoji), difficulties: difficultiesOfTopic(i) }]),
    ),
    starters,
    fillBlanks: sorted.filter((i) => i.kind === "fill_blank").map(text),
    askLevel: pickAsk(items, "level"),
    savedLines: sorted.filter((i) => i.kind === "may_line" && i.data.moment === "worry_saved").map(text),
    badges: badgeMap(items),
    hasSteps: items.some((i) => i.kind === "tiny_action" || i.kind === "opener"),
  };
}

export type StepAction = {
  key: string;
  /** mã hoạt động HD.. */
  code: string | null;
  title: string;
  minutes: number;
  /** dùng khi nào */
  when: string | null;
  steps: string[];
  /** câu nhìn lại sau khi làm */
  reflect: string | null;
  /** nút đi tiếp: soạn lời nhờ thầy cô */
  linkTo: "help" | null;
  lessonSlug: string | null;
  /** gợi ý vì khớp khó khăn đã xác nhận (không chỉ vì cùng chủ đề) */
  forDifficulty: boolean;
};
export type StepsLoop = {
  worry: { id: string; topic: string; label: string; emoji: string; difficulty: string | null } | null;
  /** việc đã thử mà chưa đỡ, nên không gợi ý lại */
  skippedUnhelpful: number;
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
    if (data && topic) {
      const difficulty = (await difficultiesOf(profile.id, [data.id])).get(data.id) ?? null;
      worry = { id: data.id, topic: data.topic, label: String(topic.data.label), emoji: String(topic.data.emoji), difficulty };
    }
  }
  const topic = worry?.topic ?? null;
  // Mây gợi ý theo KHÓ KHĂN ĐÃ XÁC NHẬN trước, bỏ việc đã thử mà chưa đỡ (pickActions)
  const [exclude, level] = worry
    ? await Promise.all([
        unhelpfulActions(profile.id, worry.id),
        createAdminClient()
          .from("worries")
          .select("level_now")
          .eq("id", worry.id)
          .maybeSingle()
          .then((r) => (r.data?.level_now as number | undefined) ?? null),
      ])
    : [[], null];
  const picked = pickActions(items, topic, { difficulty: worry?.difficulty, level, exclude });
  const matched = new Set(worry?.difficulty ? picked.filter((a) => cueHits(a, worry!.difficulty as string).length > 0).map((a) => a.key) : []);
  const actions = picked.map((a) => ({
    key: a.key,
    code: typeof a.data.code === "string" ? a.data.code : null,
    title: String(a.data.title),
    minutes: Number(a.data.minutes),
    when: typeof a.data.when === "string" ? a.data.when : null,
    steps: a.data.steps as string[],
    reflect: typeof a.data.reflect === "string" ? a.data.reflect : null,
    linkTo: a.data.linkTo === "help" ? ("help" as const) : null,
    lessonSlug: typeof a.data.lessonSlug === "string" ? a.data.lessonSlug : null,
    forDifficulty: matched.has(a.key),
  }));
  const openers = {
    parent: openersFor(items, "parent", topic),
    teacher: openersFor(items, "teacher", topic),
    friend: openersFor(items, "friend", topic),
  };
  if (!actions.length && !openers.parent.length && !openers.teacher.length && !openers.friend.length) return null;
  return {
    worry,
    skippedUnhelpful: exclude.length,
    actions,
    openers,
    doneLines: items.filter((i) => i.kind === "may_line" && i.data.moment === "action_done").map(text),
    badges: badgeMap(items),
  };
}

export type FollowupLines = Record<"followup_better" | "followup_same" | "followup_worse", string[]>;
export type FollowupWorry = {
  id: string;
  topic: string;
  label: string;
  emoji: string;
  levelStart: number;
  levelNow: number;
  /** khó khăn đã xác nhận */
  difficulty: string | null;
  /** việc nhỏ đã làm cho chuyện này (mới nhất trước), để hỏi "đã thử chưa, có ích không" */
  actionsDone: { key: string; title: string }[];
};

/** Chủ đề của một chuyện; chủ đề đã bị tắt thì vẫn hiện được bằng tên chung. */
function topicOf(items: SupportItem[], topic: string) {
  const t = items.find((i) => i.kind === "topic" && i.topic === topic);
  return t ? { label: String(t.data.label), emoji: String(t.data.emoji) } : { label: "Một chuyện", emoji: "☁️" };
}

const followupLines = (items: SupportItem[]): FollowupLines => {
  const of = (moment: keyof FollowupLines) => items.filter((i) => i.kind === "may_line" && i.data.moment === moment).map(text);
  return { followup_better: of("followup_better"), followup_same: of("followup_same"), followup_worse: of("followup_worse") };
};

const toFollowupWorry = (items: SupportItem[], w: WorryRow, difficulty: string | null = null, done: string[] = []): FollowupWorry => ({
  id: w.id,
  topic: w.topic,
  ...topicOf(items, w.topic),
  levelStart: w.level_start,
  levelNow: w.level_now,
  difficulty,
  actionsDone: done
    .map((key) => ({ key, title: items.find((i) => i.kind === "tiny_action" && i.key === key)?.data.title }))
    .filter((a): a is { key: string; title: string } => typeof a.title === "string"),
});

export type FollowupLoop = {
  worry: FollowupWorry;
  /** câu hỏi thăm đã chờ bao nhiêu ngày (bạn ấy chưa mở web lúc tới hạn); null = vừa tới hạn */
  waitingDays: number | null;
  ask: string;
  lines: FollowupLines;
  badges: LoopContent["badges"];
  hasSteps: boolean;
};

/** Thẻ "Mây hỏi thăm" trên Trang chủ: chuyện tới hạn sớm nhất. null khi không có chuyện tới hạn hoặc chưa có nội dung. */
export async function followupLoop(profile: Profile): Promise<FollowupLoop | null> {
  // đọc nội dung và chuyện tới hạn cùng lúc (trước đây nối tiếp: Trang chủ chờ thêm một lượt)
  const [items, worry] = await Promise.all([
    contentForProfile(profile, ["topic", "ask", "may_line", "badge", "tiny_action", "opener"]),
    dueWorry(profile.id),
  ]);
  const general = items.filter((i) => i.kind === "ask" && i.data.step === "followup" && i.topic === null);
  if (!general.length || !worry) return null;
  // ưu tiên câu hỏi theo đúng chủ đề
  const own = items.filter((i) => i.kind === "ask" && i.data.step === "followup" && i.topic === worry.topic);
  const pool = own.length ? own : general;
  const [difficulties, done] = await Promise.all([difficultiesOf(profile.id, [worry.id]), actionsDoneFor(profile.id, worry.id)]);
  return {
    worry: toFollowupWorry(items, worry, difficulties.get(worry.id) ?? null, done),
    waitingDays: followupWaitingDays(worry.next_check_at ? new Date(worry.next_check_at) : null),
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
  checks: { level: number; feeling: Feeling; tried: Tried | null; at: string }[];
  /** lịch sử xác nhận / sửa khó khăn, cũ trước mới sau */
  revisions: Revision[];
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
    db.from("worry_checks").select("*").eq("user_id", profile.id).order("created_at"),
    db.from("support_activity").select("kind, ref, day, worry_id, created_at").eq("user_id", profile.id).order("created_at", { ascending: false }),
    db.from("badges_earned").select("badge_key, earned_at").eq("user_id", profile.id),
  ]);

  const checksBy = new Map<string, JourneyWorry["checks"]>();
  for (const c of checks.data ?? []) {
    const list = checksBy.get(c.worry_id) ?? [];
    // cột "tried" chỉ có sau khi chạy 0014
    list.push({ level: c.level, feeling: c.feeling as Feeling, tried: (c.tried as Tried | undefined) ?? null, at: c.created_at });
    checksBy.set(c.worry_id, list);
  }

  const rows = (activity.data ?? []) as { kind: string; ref: string | null; day: string; worry_id: string | null }[];
  const doneBy = new Map<string, string[]>();
  for (const r of rows) {
    if (r.kind !== "tiny_action_done" || !r.worry_id || !r.ref) continue;
    const list = doneBy.get(r.worry_id) ?? [];
    if (!list.includes(r.ref)) list.push(r.ref);
    doneBy.set(r.worry_id, list);
  }
  const worryRows = (worries.data ?? []) as WorryRow[];
  const ids = worryRows.map((w) => w.id);
  const [difficulties, revisions] = await Promise.all([difficultiesOf(profile.id, ids), revisionsOf(profile.id, ids)]);
  const times = new Map<string, number>();
  for (const r of rows) if (r.kind === "tiny_action_done" && r.ref) times.set(r.ref, (times.get(r.ref) ?? 0) + 1);
  const actionTitles = new Map(items.filter((i) => i.kind === "tiny_action").map((i) => [i.key, String(i.data.title)]));

  const earnedAt = new Map((earned.data ?? []).map((e) => [e.badge_key as string, e.earned_at as string]));
  const badgeItems = items.filter((i) => i.kind === "badge").sort((a, b) => a.sortOrder - b.sortOrder);
  const general = items.filter((i) => i.kind === "ask" && i.data.step === "followup" && i.topic === null);

  return {
    worries: worryRows.map((w) => ({
      ...toFollowupWorry(items, w, difficulties.get(w.id) ?? null, doneBy.get(w.id) ?? []),
      note: w.note,
      status: w.status,
      nextCheckAt: w.next_check_at,
      createdAt: w.created_at,
      checks: checksBy.get(w.id) ?? [],
      revisions: revisions.get(w.id) ?? [],
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
