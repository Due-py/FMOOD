// Số liệu "Vòng hỗ trợ" cho trang Kết quả nghiên cứu (hàm thuần, không đọc cơ sở dữ liệu).
// Ẩn mọi nhóm dưới 5 học sinh để không ai bị nhận ra. Chuyện học sinh đã xóa không có trong đầu vào.
import { WHO, type Who } from "@/lib/support-picks";
import type { Feeling, Tried } from "@/lib/worries-shared";
import { MIN_GROUP } from "@/lib/staff-privacy";

export const MIN_STUDENTS = MIN_GROUP;

export type StatsInput = {
  worries: {
    id: string;
    userId: string;
    topic: string;
    levelStart: number;
    checks: { level: number; feeling: Feeling; tried?: Tried | null; at: string }[];
  }[];
  told: { userId: string; who: string }[];
  tinyActions: { userId: string }[];
  topicLabels: Record<string, string>;
};

export type LoopGroupStats = {
  students: number;
  worries: number;
  /** số chuyện có ít nhất một lần hỏi lại */
  followedUp: number;
  /** mức lo lần hỏi lại cuối so với lúc kể (con số 1–5) */
  down: number;
  same: number;
  up: number;
  /** trung bình trên các chuyện đã được hỏi lại; null khi chưa có */
  avgStart: number | null;
  avgLast: number | null;
};

export type SupportLoopStats = {
  overall: LoopGroupStats | null;
  byTopic: { topic: string; label: string; stats: LoopGroupStats | null }[];
  /** lựa chọn ở lần trả lời cuối của mỗi chuyện (báo cáo riêng, không thay con số) */
  feelings: Record<Feeling, number> | null;
  told: { who: Who; students: number | null; times: number | null }[];
  tinyActions: { students: number; times: number } | null;
  /**
   * Lần hỏi lại cuối của mỗi chuyện, tách theo câu "đã thử việc nhỏ chưa" (HD06). "none" = không trả lời.
   * Chưa thử KHÔNG gộp vào "thử rồi mà chưa đỡ". Mỗi nhóm kèm mức lo giảm / giữ / tăng so với lúc kể.
   */
  tried: Record<Tried | "none", { worries: number; down: number; same: number; up: number }> | null;
};

const round1 = (x: number) => Math.round(x * 10) / 10;
const avg = (xs: number[]) => (xs.length ? round1(xs.reduce((s, x) => s + x, 0) / xs.length) : null);
const lastCheck = (w: StatsInput["worries"][number]) =>
  w.checks.length ? [...w.checks].sort((a, b) => a.at.localeCompare(b.at))[w.checks.length - 1] : null;

function groupStats(worries: StatsInput["worries"]): LoopGroupStats | null {
  const students = new Set(worries.map((w) => w.userId)).size;
  if (students < MIN_STUDENTS) return null;
  const followed = worries.map((w) => ({ w, last: lastCheck(w) })).filter((x) => x.last !== null);
  const diff = followed.map(({ w, last }) => Math.sign(last!.level - w.levelStart));
  return {
    students,
    worries: worries.length,
    followedUp: followed.length,
    down: diff.filter((d) => d < 0).length,
    same: diff.filter((d) => d === 0).length,
    up: diff.filter((d) => d > 0).length,
    avgStart: avg(followed.map(({ w }) => w.levelStart)),
    avgLast: avg(followed.map(({ last }) => last!.level)),
  };
}

export function supportLoopStats(input: StatsInput): SupportLoopStats {
  const overall = groupStats(input.worries);

  const topics = [...new Set(input.worries.map((w) => w.topic))];
  const byTopic = topics.map((topic) => ({
    topic,
    label: input.topicLabels[topic] ?? topic,
    stats: overall ? groupStats(input.worries.filter((w) => w.topic === topic)) : null,
  }));

  let feelings: SupportLoopStats["feelings"] = null;
  if (overall) {
    feelings = { better: 0, same: 0, worse: 0, done: 0 };
    for (const w of input.worries) {
      const last = lastCheck(w);
      if (last) feelings[last.feeling] += 1;
    }
  }

  const told = WHO.map((who) => {
    const rows = input.told.filter((t) => t.who === who);
    const students = new Set(rows.map((r) => r.userId)).size;
    return students >= MIN_STUDENTS ? { who, students, times: rows.length } : { who, students: null, times: null };
  });

  let tried: SupportLoopStats["tried"] = null;
  if (overall) {
    const empty = () => ({ worries: 0, down: 0, same: 0, up: 0 });
    tried = { not_yet: empty(), no_help: empty(), helped: empty(), none: empty() };
    for (const w of input.worries) {
      const last = lastCheck(w);
      if (!last) continue;
      const g = tried[last.tried ?? "none"];
      const d = Math.sign(last.level - w.levelStart);
      g.worries += 1;
      if (d < 0) g.down += 1;
      else if (d > 0) g.up += 1;
      else g.same += 1;
    }
  }

  const actionStudents = new Set(input.tinyActions.map((a) => a.userId)).size;
  return {
    overall,
    byTopic,
    feelings,
    told,
    tinyActions: actionStudents >= MIN_STUDENTS ? { students: actionStudents, times: input.tinyActions.length } : null,
    tried,
  };
}
