// MÂY ĐOÁN CHỦ ĐỀ từ tin nhắn bằng cụm từ nhận diện của từng chủ đề (không gọi AI, không làm chậm Mây).
// Đoán chỉ để hỏi lại "Có phải bạn đang lo chuyện…?"; học sinh bấm "Đúng" thì mới lưu.
import { fold, normalizeForMatch } from "@/lib/safety/normalize";

export type TopicTriggers = { key: string; triggers: string[] };

/** Chủ đề "Chuyện khác" quá chung để đoán. */
const NEVER_GUESS = new Set(["khac"]);

const words = (s: string) => s.toLowerCase().normalize("NFC").split(/[^\p{L}\p{N}]+/u).filter(Boolean).join(" ");

/**
 * Chủ đề khớp nhiều cụm từ nhất (bằng nhau thì lấy chủ đề đứng trước), hoặc null.
 * Tin nhắn có dấu thì so có dấu ("thì" khác "thi"); gõ không dấu / viết tắt thì so bản đã chuẩn hóa.
 */
export function guessTopic(text: string, topics: TopicTriggers[]): string | null {
  const lower = words(text);
  const accented = fold(lower) !== lower;
  const haystack = ` ${accented ? lower : normalizeForMatch(text)} `;

  let best: { key: string; hits: number } | null = null;
  for (const t of topics) {
    if (NEVER_GUESS.has(t.key)) continue;
    const hits = t.triggers.filter((trigger) => {
      const needle = accented ? words(trigger) : normalizeForMatch(trigger);
      return needle && haystack.includes(` ${needle} `);
    }).length;
    if (hits > 0 && (!best || hits > best.hits)) best = { key: t.key, hits };
  }
  return best?.key ?? null;
}
