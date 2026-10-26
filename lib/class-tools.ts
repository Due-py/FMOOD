import { z } from "zod";
import { addDays } from "@/lib/dates";
import { HABIT_ICONS } from "@/lib/habit-icons";
import { MIN_GROUP } from "@/lib/staff-privacy";

// CÔNG CỤ LỚP HỌC CỦA GIÁO VIÊN (phần tính toán thuần, có test)
// Mọi con số về nhóm học sinh đều ẩn khi dưới MIN_GROUP bạn.

type Group = "positive" | "neutral" | "negative";

/** "Lớp 7A"; tên lớp đã bắt đầu bằng "Lớp" thì giữ nguyên (tránh "Lớp Lớp…"). */
export function classLabel(name: string): string {
  const n = name.normalize("NFC").trim();
  return /^lớp(\s|$)/i.test(n) ? n : `Lớp ${n}`;
}

/** Biểu tượng cho bài giáo viên soạn. */
export const LESSON_EMOJIS = ["📘", "🌱", "💛", "🧠", "🤝", "🌈", "😌", "💬", "⭐", "🎯"];

// ───────── Thử thách của lớp ─────────

export const challengeSchema = z.object({
  title: z.string().trim().min(3, "Tên thử thách ngắn quá").max(60, "Tên thử thách tối đa 60 ký tự"),
  icon: z.string().refine((s) => HABIT_ICONS.includes(s), "Chọn một biểu tượng"),
  description: z.string().trim().max(200, "Lời nhắn tối đa 200 ký tự").default(""),
  weeks: z.union([z.literal(1), z.literal(2)]),
});

/** Ngày cuối của thử thách bắt đầu hôm nay, kéo dài 1 hoặc 2 tuần. */
export function challengeEndsOn(today: string, weeks: 1 | 2): string {
  return addDays(today, weeks * 7 - 1);
}

export function isChallengeOpen(c: { status: "open" | "closed"; ends_on: string }, today: string): boolean {
  return c.status === "open" && c.ends_on >= today;
}

/** Số bạn tham gia và tổng lượt làm; dưới MIN_GROUP bạn thì ẩn cả hai. */
export function challengeStats(rows: { userId: string; logs: number }[]): { joined: number | null; doneTimes: number | null } {
  const joined = new Set(rows.map((r) => r.userId)).size;
  if (joined < MIN_GROUP) return { joined: null, doneTimes: null };
  return { joined, doneTimes: rows.reduce((s, r) => s + r.logs, 0) };
}

// ───────── Nhịp cảm xúc của lớp: tuần này so với tuần trước ─────────

export type WeekShare = { participants: number; share: Record<Group, number> | null };
export type WeekPulse = { thisWeek: WeekShare; lastWeek: WeekShare; change: "better" | "same" | "worse" | null };

function share(rows: { user_id: string; groups: Group[] }[]): WeekShare {
  const participants = new Set(rows.map((r) => r.user_id)).size;
  if (participants < MIN_GROUP) return { participants, share: null };
  const counts: Record<Group, number> = { positive: 0, neutral: 0, negative: 0 };
  for (const r of rows) for (const g of r.groups) counts[g] += 1;
  const total = counts.positive + counts.neutral + counts.negative || 1;
  const pct = (g: Group) => Math.round((counts[g] / total) * 100);
  return { participants, share: { positive: pct("positive"), neutral: pct("neutral"), negative: pct("negative") } };
}

/** Thay đổi dưới 10 điểm phần trăm "nặng lòng" coi là như cũ. */
const CHANGE_POINTS = 10;

export function weekPulse(rows: { user_id: string; day: string; groups: Group[] }[], today: string): WeekPulse {
  const weekStart = addDays(today, -6);
  const lastStart = addDays(today, -13);
  const thisWeek = share(rows.filter((r) => r.day >= weekStart && r.day <= today));
  const lastWeek = share(rows.filter((r) => r.day >= lastStart && r.day < weekStart));
  let change: WeekPulse["change"] = null;
  if (thisWeek.share && lastWeek.share) {
    const diff = thisWeek.share.negative - lastWeek.share.negative;
    change = diff <= -CHANGE_POINTS ? "better" : diff >= CHANGE_POINTS ? "worse" : "same";
  }
  return { thisWeek, lastWeek, change };
}

// ───────── Chuyện bận lòng chung của lớp ─────────

/** Chủ đề có từ MIN_GROUP bạn trở lên (đếm theo bạn, không theo lần kể). Không có nội dung. */
export function commonWorries(rows: { user_id: string; topic: string }[]): {
  shown: { topic: string; students: number }[];
  hiddenTopics: number;
} {
  const byTopic = new Map<string, Set<string>>();
  for (const r of rows) byTopic.set(r.topic, (byTopic.get(r.topic) ?? new Set()).add(r.user_id));
  const all = [...byTopic].map(([topic, set]) => ({ topic, students: set.size }));
  return {
    shown: all.filter((t) => t.students >= MIN_GROUP).sort((a, b) => b.students - a.students),
    hiddenTopics: all.filter((t) => t.students < MIN_GROUP).length,
  };
}
