// TRỢ LÝ ĐOÁN CHỦ ĐỀ từ tin nhắn bằng cụm từ nhận diện của từng chủ đề (không gọi AI, không làm chậm trợ lý).
// Đoán chỉ để hỏi lại "Có phải bạn đang lo chuyện…?"; học sinh bấm "Đúng" thì mới lưu.
import { fold, normalizeForMatch } from "@/lib/safety/normalize";

export type TopicTriggers = { key: string; triggers: string[] };

/** Chủ đề "Chuyện khác" quá chung để đoán. */
const NEVER_GUESS = new Set(["khac"]);

/**
 * Cụm nhận diện chỉ có MỘT chữ không khớp khi chữ đó là phần đầu của một từ ghép khác nghĩa
 * ("xấu hổ" không phải chuyện ngoại hình, "thi đua" không phải thi cử). So bằng chữ đã bỏ dấu, áp cho mọi chủ đề,
 * nên cô Thúy không phải tránh cụm một chữ khi soạn nội dung. Thêm từ ghép mới vào đây khi gặp đoán nhầm.
 */
const NOT_FOLLOWED_BY: Record<string, string[]> = {
  xau: ["ho", "bung"],
  thi: ["dua", "thoang", "cong", "hanh", "sinh", "si", "tran"],
  bo: ["cuc", "tri", "thi", "sung", "doi", "qua", "tui"],
  me: ["man", "say", "cung"],
  beo: ["bo"],
};

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

/** Các chủ đề có cụm từ khớp, kèm đúng những cụm từ đã khớp (để trang Trình diễn cho thấy vì sao trợ lý đoán vậy). */
export function topicMatches(text: string, topics: TopicTriggers[]): { key: string; triggers: string[] }[] {
  const lower = words(text);
  const accented = fold(lower) !== lower;
  const haystack = ` ${accented ? lower : normalizeForMatch(text)} `;
  return topics
    // dòng không có mã chủ đề (vd. việc nhỏ dùng chung) thì không đoán: đoán ra null là thẻ "undefined"
    .filter((t) => t.key && !NEVER_GUESS.has(t.key))
    .map((t) => ({
      key: t.key,
      triggers: t.triggers.filter((trigger) => {
        const needle = accented ? words(trigger) : normalizeForMatch(trigger);
        return needle ? hasPhrase(haystack, needle) : false;
      }),
    }))
    .filter((m) => m.triggers.length > 0);
}

/** Cụm có trong câu (đủ chữ); cụm một chữ thì bỏ qua chỗ nó là phần đầu của từ ghép khác nghĩa (NOT_FOLLOWED_BY). */
function hasPhrase(haystack: string, needle: string): boolean {
  const skipNext = needle.includes(" ") ? undefined : NOT_FOLLOWED_BY[fold(needle)];
  for (let i = haystack.indexOf(` ${needle} `); i !== -1; i = haystack.indexOf(` ${needle} `, i + 1)) {
    if (!skipNext) return true;
    const next = haystack.slice(i + needle.length + 2).split(" ", 1)[0];
    if (!skipNext.includes(fold(next))) return true;
  }
  return false;
}
