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
  let best: { key: string; hits: number } | null = null;
  for (const m of topicMatches(text, topics)) if (!best || m.triggers.length > best.hits) best = { key: m.key, hits: m.triggers.length };
  return best?.key ?? null;
}

/** Các chủ đề có cụm từ khớp, kèm đúng những cụm từ đã khớp (để trang Trình diễn cho thấy vì sao Mây đoán vậy). */
export function topicMatches(text: string, topics: TopicTriggers[]): { key: string; triggers: string[] }[] {
  const lower = words(text);
  const accented = fold(lower) !== lower;
  const haystack = ` ${accented ? lower : normalizeForMatch(text)} `;
  return topics
    .filter((t) => !NEVER_GUESS.has(t.key))
    .map((t) => ({
      key: t.key,
      triggers: t.triggers.filter((trigger) => {
        const needle = accented ? words(trigger) : normalizeForMatch(trigger);
        return needle && haystack.includes(` ${needle} `);
      }),
    }))
    .filter((m) => m.triggers.length > 0);
}
