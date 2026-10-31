// THẺ GỢI Ý TRONG CÂU TRẢ LỜI (kế hoạch Demo 3, Bước 10.3): ba dòng đặc biệt AI được thêm ở CUỐI câu trả lời
//   [GOAL: Tên mục tiêu | Mô tả 1 câu]   [SKILL: Tên kỹ năng]   [END: Một câu ngắn, ấm áp]
// Tin nhắn lưu nguyên văn; lúc hiện mới tách thẻ ra (học sinh không thấy chữ trong ngoặc vuông).
// Kiểm tra chặt: dòng sai định dạng, có dấu * hay markdown, tên kỹ năng không khớp nguyên văn, quá một dòng mỗi loại
// → bỏ dòng, không hiện thẻ. Hàm thuần, dùng chung cho máy chủ và trình duyệt. Có test (reply-cards.test.ts).
import { skillBySuggestName, suggestableSkillNames, type SkillCode } from "@/lib/skills";

export type CardKind = "goal" | "skill" | "end";
export const CARD_KINDS: CardKind[] = ["goal", "skill", "end"];

export type ReplyCards = {
  goal?: { title: string; description: string };
  skill?: { name: string; code: SkillCode };
  end?: { text: string };
};

/** Giới hạn máy chủ kiểm tra (khớp lời dặn phần 6). */
export const CARD_LIMITS = { goalTitle: 40, goalDescription: 120, end: 120 } as const;

const KIND: Record<string, CardKind> = { GOAL: "goal", SKILL: "skill", END: "end" };

/** Dòng có dạng thẻ (kể cả viết sai: có **, gạch đầu dòng, chữ thường): luôn bị tách khỏi câu văn. */
const LOOSE = /^[\s*_>#`~-]*\[\s*(GOAL|SKILL|END)\s*:/i;
/** Dòng thẻ đúng mẫu: cả dòng là [LOẠI: nội dung], không có gì trước hay sau. */
const STRICT = /^\[(GOAL|SKILL|END):\s*([^[\]]+?)\s*\]$/;
/** Ký tự markdown không được có trong dòng thẻ. */
const MARKDOWN = /[*`#~_]/;

export function isCardLine(line: string): boolean {
  return LOOSE.test(line);
}

/** Bỏ mọi dòng có dạng thẻ (đúng hay sai) và dòng trống thừa ở cuối: phần câu văn học sinh thấy. */
export function stripCardLines(reply: string): string {
  return reply
    .split(/\r?\n/)
    .filter((l) => !isCardLine(l))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Câu chỉ có một câu: không có dấu kết câu ở giữa rồi còn chữ phía sau. */
const oneSentence = (s: string) => !/[.!?…]\s+\S/.test(s);

function readCard(kind: CardKind, body: string, skills: string[]): ReplyCards[CardKind] | null {
  if (kind === "goal") {
    const parts = body.split("|");
    if (parts.length !== 2) return null;
    const [title, description] = parts.map((p) => p.trim());
    if (!title || !description || title.length > CARD_LIMITS.goalTitle || description.length > CARD_LIMITS.goalDescription) return null;
    return { title, description };
  }
  if (kind === "skill") {
    // khớp NGUYÊN VĂN một tên trong danh sách đang bật; thêm bớt chữ nào cũng bỏ
    if (!skills.includes(body)) return null;
    const code = skillBySuggestName(body);
    return code ? { name: body, code } : null;
  }
  if (!body || body.length > CARD_LIMITS.end || !oneSentence(body)) return null;
  return { text: body };
}

/**
 * Tách thẻ khỏi câu trả lời. Chỉ nhận dòng thẻ nằm ở CUỐI (sau phần trò chuyện, chỉ cách nhau bởi dòng trống),
 * mỗi loại đúng một dòng. Dòng dạng thẻ ở chỗ khác vẫn bị bỏ khỏi câu văn nhưng không thành thẻ.
 * `skills`: tên kỹ năng được phép gợi ý (phần 7 của lời dặn).
 */
export function parseReplyCards(reply: string, skills: string[] = suggestableSkillNames()): { text: string; cards: ReplyCards } {
  const lines = reply.split(/\r?\n/);
  // khối cuối: các dòng dạng thẻ và dòng trống liền nhau ở cuối câu trả lời
  let tail = lines.length;
  while (tail > 0 && (!lines[tail - 1].trim() || isCardLine(lines[tail - 1]))) tail--;
  const trailing = lines.slice(tail).filter((l) => l.trim());

  // đếm theo loại trên MỌI dòng dạng thẻ: quá một dòng một loại thì bỏ cả loại đó
  const count = new Map<CardKind, number>();
  for (const l of lines) {
    const m = LOOSE.exec(l);
    if (m) {
      const k = KIND[m[1].toUpperCase()];
      count.set(k, (count.get(k) ?? 0) + 1);
    }
  }

  const cards: ReplyCards = {};
  for (const raw of trailing) {
    const line = raw.trim();
    if (MARKDOWN.test(line)) continue;
    const m = STRICT.exec(line);
    if (!m) continue;
    const kind = KIND[m[1]];
    if (count.get(kind) !== 1) continue;
    const card = readCard(kind, m[2].trim(), skills);
    if (card) Object.assign(cards, { [kind]: card });
  }
  return { text: stripCardLines(reply), cards };
}

export function hasCards(cards: ReplyCards): boolean {
  return Boolean(cards.goal || cards.skill || cards.end);
}

/**
 * Chữ hiện trong lúc AI đang viết: bỏ dòng dạng thẻ; dòng cuối còn dở mà bắt đầu bằng "[" (có thể là thẻ đang viết)
 * thì tạm ẩn cho tới khi viết xong dòng.
 */
export function visibleReply(text: string, streaming: boolean): string {
  let t = text;
  if (streaming) {
    const at = t.lastIndexOf("\n");
    if (/^[\s*_]*\[/.test(t.slice(at + 1))) t = t.slice(0, at + 1);
  }
  return stripCardLines(t);
}

/**
 * Chia câu trả lời thành các bong bóng (Bước 9.3): AI tách tin bằng một dòng trống. Nhiều hơn `max` đoạn
 * thì gộp phần dư vào bong bóng cuối, để không vượt số tin tối đa của mức độ dài.
 */
export function splitBubbles(text: string, max: number): string[] {
  const parts = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 1) return [text.trim()];
  const keep = Math.max(1, max);
  if (parts.length <= keep) return parts;
  return [...parts.slice(0, keep - 1), parts.slice(keep - 1).join("\n\n")];
}
