// NHÌN LẠI VÀ VẬN DỤNG (kế hoạch Demo 3, Bước 4; thuộc Demo 2.1). Dùng chung cho máy chủ, trình duyệt và test.
// Không đọc cơ sở dữ liệu. Chỉ so học sinh với chính mình: không có điểm, không xếp hạng, không so với bạn khác.

import { dayKey } from "@/lib/dates";
import { casesForSkill, SKILL_IDS, type PracticeCase, type SkillId } from "@/lib/skills";
import type { PracticeFeedback } from "./shared";
import type { Answers, PracticeState } from "./state";

/** Câu hỏi lại sau 1–3 ngày (mục 4.1). */
export const USED_QUESTION = "Từ hôm đó, bạn đã dùng cách này ngoài đời chưa?";
export const NEXT_TIME_QUESTION = "Lần sau bạn sẽ chỉnh gì?";

/** "Đã dùng thật chưa": dùng rồi thấy có ích · dùng rồi mà còn khó · chưa có dịp dùng. */
export const USED = ["helped", "hard", "not_yet"] as const;
export type Used = (typeof USED)[number];
export const USED_LABEL: Record<Used, string> = {
  helped: "Dùng rồi, thấy có ích",
  hard: "Dùng rồi, còn khó",
  not_yet: "Chưa có dịp dùng",
};
export const USED_EMOJI: Record<Used, string> = { helped: "👍", hard: "🤔", not_yet: "⏳" };
export const isUsed = (v: unknown): v is Used => typeof v === "string" && (USED as readonly string[]).includes(v);

/** Chọn nhanh cho "Lần sau bạn sẽ chỉnh gì?" (bấm một ô, viết thêm nếu muốn). */
export const NEXT_TIME_CHOICES = [
  "Giữ nguyên cách này",
  "Bắt đầu sớm hơn",
  "Chia việc nhỏ hơn",
  "Nhờ người giúp sớm hơn",
  "Thử một cách khác",
] as const;

export const NEXT_TIME_MAX = 200;

/**
 * Điều học sinh sẽ chỉnh lần sau: ô chọn nhanh và / hoặc lời tự viết, gộp thành một câu (tối đa 200 ký tự).
 * Ô chọn không có trong danh sách thì bỏ. Không chọn, không viết (hoặc viết dưới 2 chữ cái) thì null.
 */
export function cleanNextTime(choice: string | null | undefined, text: string | null | undefined): string | null {
  const picked = choice && (NEXT_TIME_CHOICES as readonly string[]).includes(choice) ? choice : null;
  const own = (text ?? "").replace(/\s+/g, " ").trim();
  const joined = [picked, own.length >= 2 ? own : null].filter(Boolean).join(": ");
  return joined.length >= 2 ? joined.slice(0, NEXT_TIME_MAX) : null;
}

/** Hỏi lại một bài luyện đã hoàn thành sau 1–3 ngày (theo ngày giờ Việt Nam), chỉ một lần. */
export const FOLLOWUP_DAYS = { from: 1, to: 3 } as const;

/** Số ngày (giờ Việt Nam) từ lúc hoàn thành tới bây giờ. */
export function daysSince(iso: string, now: Date): number {
  const a = Date.parse(`${dayKey(iso)}T00:00:00Z`);
  const b = Date.parse(`${dayKey(now)}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export type FollowupCandidate = { id: string; state: PracticeState; completed_at: string | null; followup_at: string | null };

/** Bài luyện tới hạn hỏi lại: đã hoàn thành 1–3 ngày trước và chưa hỏi lại (đã trả lời hay bỏ qua đều thôi hỏi). Cũ nhất trước. */
export function dueFollowup<T extends FollowupCandidate>(rows: T[], now: Date): T | null {
  const due = rows.filter((r) => {
    if (r.state !== "completed" || !r.completed_at || r.followup_at) return false;
    const d = daysSince(r.completed_at, now);
    return d >= FOLLOWUP_DAYS.from && d <= FOLLOWUP_DAYS.to;
  });
  due.sort((a, b) => (a.completed_at as string).localeCompare(b.completed_at as string));
  return due[0] ?? null;
}

/**
 * Tình huống mới để dùng lại kỹ năng vừa luyện (mục 4.2): một tình huống TL KHÁC cùng kỹ năng,
 * ưu tiên tình huống học sinh chưa luyện; luyện hết rồi thì lấy tình huống luyện lâu nhất (thứ tự trong `used`: mới trước).
 */
export function suggestNextCase(skill: SkillId, current: string | null, used: string[]): PracticeCase | null {
  const options = casesForSkill(skill).filter((c) => c.code !== current);
  if (!options.length) return null;
  const fresh = options.find((c) => !used.includes(c.code));
  if (fresh) return fresh;
  return [...options].sort((a, b) => used.indexOf(b.code) - used.indexOf(a.code))[0];
}

// ───────── Hành trình theo kỹ năng (mục 4.3) ─────────

export type JourneySessionRow = {
  id: string;
  skill: SkillId;
  state: PracticeState;
  case_code: string | null;
  situation: string | null;
  next_try: string | null;
  next_time?: string | null;
  followup_used?: string | null;
  completed_at: string | null;
  updated_at: string;
  /** bài lần 1, lần 2 của bài luyện này (kèm góp ý của lần đó) */
  attempts: { version: 1 | 2; answers: Answers; feedback?: PracticeFeedback | null }[];
};

export type SkillJourney = {
  skill: SkillId;
  /** số lần đã thật sự luyện (đã qua bước Hiểu) */
  practiced: number;
  completed: number;
  lastAt: string | null;
  /**
   * Thẻ minh chứng của bài gần nhất có bài làm (kế hoạch V2 mục 11.4): lần đầu, góp ý nhận được, lần sửa sau góp ý,
   * điều tự rút ra (Nhìn lại), việc đã thử ngoài đời do học sinh TỰ BÁO khi được hỏi lại. Phần nào chưa có là null.
   */
  latest: {
    id: string;
    situation: string | null;
    at: string;
    v1: Answers | null;
    feedback: PracticeFeedback | null;
    v2: Answers | null;
    nextTry: string | null;
    used: string | null;
    completed: boolean;
  } | null;
  /** những điều học sinh tự rút ra: việc sẽ thử (Nhìn lại) và điều sẽ chỉnh lần sau (hỏi lại), mới trước, tối đa 5 */
  notes: { text: string; kind: "next_try" | "next_time"; at: string }[];
  /** số lần học sinh nói đã dùng cách này thật (khi được hỏi lại) */
  usedForReal: number;
};

/** Gom bài luyện của MỘT học sinh theo mô-đun luyện (SKILL_IDS). Không tính điểm, không so với ai. `rows` mới trước. */
export function skillJourney(rows: JourneySessionRow[]): SkillJourney[] {
  return SKILL_IDS.map((skill) => {
    const mine = rows.filter((r) => r.skill === skill && r.state !== "not_started");
    const withWork = mine.find((r) => r.attempts.length > 0);
    const notes: SkillJourney["notes"] = [];
    for (const r of mine) {
      const at = r.completed_at ?? r.updated_at;
      if (r.next_time) notes.push({ text: r.next_time, kind: "next_time", at: r.updated_at });
      if (r.next_try) notes.push({ text: r.next_try, kind: "next_try", at });
    }
    notes.sort((a, b) => b.at.localeCompare(a.at));
    return {
      skill,
      practiced: mine.length,
      completed: mine.filter((r) => r.state === "completed").length,
      lastAt: mine[0]?.updated_at ?? null,
      latest: withWork
        ? {
            id: withWork.id,
            situation: withWork.situation,
            at: withWork.updated_at,
            v1: withWork.attempts.find((a) => a.version === 1)?.answers ?? null,
            feedback: withWork.attempts.find((a) => a.version === 1)?.feedback ?? null,
            v2: withWork.attempts.find((a) => a.version === 2)?.answers ?? null,
            nextTry: withWork.next_try,
            used: withWork.followup_used ?? null,
            completed: withWork.state === "completed",
          }
        : null,
      notes: notes.slice(0, 5),
      usedForReal: mine.filter((r) => r.followup_used === "helped" || r.followup_used === "hard").length,
    };
  });
}
