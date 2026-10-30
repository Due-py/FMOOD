// CHUYỆN BẬN LÒNG: quy tắc dùng chung cho máy chủ và trình duyệt (không đọc cơ sở dữ liệu).
import type { EmotionGroup } from "@/lib/emotions";

/** Mây hỏi lại sau bao nhiêu ngày. */
export const FOLLOW_UP_DAYS = 3;

/** Nhãn cho mức lo 1–5 (vị trí 0 là mức 1). */
export const LEVEL_LABELS = ["Hơi lo", "Lo một chút", "Lo vừa vừa", "Lo nhiều", "Lo rất nhiều"] as const;

export const NOTE_MAX = 200;

/** Sau check-in, hỏi "chuyện gì làm bạn thấy vậy?" khi cảm xúc nặng lòng chiếm đa số. */
export function wantsTopicStep(group: EmotionGroup): boolean {
  return group === "negative";
}

export function nextCheckAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + FOLLOW_UP_DAYS * 86_400_000);
}

export type WorryInput = { topic: string; level: number; note?: string };

export function validateWorry(
  input: WorryInput,
  visibleTopics: Set<string>,
): { ok: true; value: { topic: string; level: number; note: string | null } } | { ok: false; error: string } {
  if (!visibleTopics.has(input.topic)) return { ok: false, error: "Chủ đề này chưa dùng được." };
  if (!Number.isInteger(input.level) || input.level < 1 || input.level > 5) return { ok: false, error: "Chọn mức lo từ 1 tới 5 nhé." };
  const note = (input.note ?? "").trim();
  if (note.length > NOTE_MAX) return { ok: false, error: `Viết ngắn thôi, tối đa ${NOTE_MAX} ký tự nhé.` };
  return { ok: true, value: { topic: input.topic, level: input.level, note: note || null } };
}

// ── Hỏi lại ──

export type WorryStatus = "open" | "better" | "done" | "stale";
export type Feeling = "better" | "same" | "worse" | "done";
export const FEELINGS: readonly Feeling[] = ["better", "same", "worse", "done"];

/** Sau lần trả lời thứ mấy thì thôi hỏi (học sinh vẫn tự cập nhật được trong Hành trình). */
export const MAX_CHECKS = 3;
/** Thẻ tới hạn quá bao nhiêu ngày không ai trả lời thì coi là lâu không cập nhật. */
export const STALE_DAYS = 14;

export type WorryState = {
  status: WorryStatus;
  levelStart: number;
  levelNow: number;
  checksCount: number;
  nextCheckAt: Date | null;
};

/** Đã đỡ / đã xong là chuyện đã qua; còn lại học sinh vẫn trả lời được. */
export function canAnswer(status: WorryStatus): boolean {
  return status === "open" || status === "stale";
}

export function isStale(w: WorryState, now: Date): boolean {
  return w.status === "open" && w.nextCheckAt !== null && now.getTime() - w.nextCheckAt.getTime() > STALE_DAYS * 86_400_000;
}

/**
 * Trạng thái mới sau một lần trả lời. "Chuyện này xong rồi" → đã xong; mức lo ≤ 1 → đã đỡ;
 * còn lại hẹn hỏi lại sau 3 ngày, tới lần trả lời thứ 3 thì thôi hẹn.
 * `levelDropped`: mức lo thấp hơn lúc kể (để trao huy hiệu "Nhẹ lòng hơn"); không tính khi học sinh chọn "Nặng hơn".
 */
export function nextWorryState(
  w: WorryState,
  answer: { level: number; feeling: Feeling },
  now: Date,
): WorryState & { levelDropped: boolean } {
  const checksCount = w.checksCount + 1;
  const status: WorryStatus = answer.feeling === "done" ? "done" : answer.level <= 1 ? "better" : "open";
  return {
    status,
    levelStart: w.levelStart,
    levelNow: answer.level,
    checksCount,
    nextCheckAt: status === "open" && checksCount < MAX_CHECKS ? nextCheckAt(now) : null,
    levelDropped: answer.level < w.levelStart && answer.feeling !== "worse",
  };
}

// ── Khó khăn đã xác nhận ──

/** Câu tóm tắt khó khăn học sinh đã đồng ý (Mây tóm tắt hoặc học sinh tự viết / tự sửa). */
export const DIFFICULTY_MAX = 240;

export function cleanDifficulty(text: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = text.replace(/\s+/g, " ").trim();
  if (value.length < 4) return { ok: false, error: "Viết thêm một chút nhé." };
  if (value.length > DIFFICULTY_MAX) return { ok: false, error: `Viết ngắn thôi, tối đa ${DIFFICULTY_MAX} ký tự nhé.` };
  return { ok: true, value };
}

/** Câu tóm tắt đến từ đâu: Mây tóm tắt trong trò chuyện, dòng học sinh viết lúc kể, hay học sinh tự sửa. */
export type DifficultySource = "chat" | "checkin" | "journey";
/** confirmed: học sinh bấm "Đúng rồi"; rejected: học sinh nói "Chưa đúng" (vẫn lưu lại để thấy lịch sử sửa). */
export type RevisionAction = "confirmed" | "rejected";

// ── Hỏi lại: đã thử việc nhỏ chưa (HD06) ──

/** Chưa thử · thử rồi mà chưa đỡ · thử rồi thấy có ích. Không trả lời thì để trống (không tính vào đâu). */
export type Tried = "not_yet" | "no_help" | "helped";
export const TRIED: readonly Tried[] = ["not_yet", "no_help", "helped"];
export const TRIED_LABEL: Record<Tried, string> = {
  not_yet: "Chưa thử",
  no_help: "Thử rồi, chưa đỡ",
  helped: "Thử rồi, thấy có ích",
};

export function isTried(value: unknown): value is Tried {
  return typeof value === "string" && (TRIED as readonly string[]).includes(value);
}

/** Học sinh thấy nặng hơn ở mức "Lo rất nhiều" thì báo thầy cô phụ trách (không kèm chuyện học sinh kể). */
export function followupNeedsAlert(answer: { level: number; feeling: Feeling }): boolean {
  return answer.feeling === "worse" && answer.level === 5;
}

/** Lời Mây sau khi học sinh trả lời (theo lựa chọn của học sinh, không theo con số). */
export function followupMoment(feeling: Feeling): "followup_better" | "followup_same" | "followup_worse" {
  return feeling === "same" ? "followup_same" : feeling === "worse" ? "followup_worse" : "followup_better";
}
