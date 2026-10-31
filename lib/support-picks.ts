// Chọn việc nhỏ và câu mở lời hợp với chuyện bận lòng (dùng chung máy chủ và trình duyệt).
import { fold, normalizeForMatch } from "@/lib/safety/normalize";
import type { SupportItem } from "./support-content";

export const WHO = ["parent", "teacher", "friend", "other"] as const;
export type Who = (typeof WHO)[number];

export function isWho(value: string): value is Who {
  return (WHO as readonly string[]).includes(value);
}

const byOrder = (a: SupportItem, b: SupportItem) => a.sortOrder - b.sortOrder;

export type PickContext = {
  /** khó khăn học sinh đã xác nhận (câu tóm tắt đã đồng ý) */
  difficulty?: string | null;
  /** mức lo hiện tại: việc có maxLevel thấp hơn thì không gợi ý */
  level?: number | null;
  /** việc đã thử mà chưa đỡ: không gợi ý lại */
  exclude?: string[];
};

const words = (s: string) => s.toLowerCase().normalize("NFC").split(/[^\p{L}\p{N}]+/u).filter(Boolean).join(" ");

/**
 * Các cụm từ của việc này có trong khó khăn đã xác nhận (nguyên từ). Câu có dấu thì so CÓ DẤU ("rối" khác "rồi");
 * câu gõ không dấu / viết tắt thì so bản đã chuẩn hóa (giống trợ lý đoán chủ đề).
 */
export function cueHits(action: SupportItem, difficulty: string): string[] {
  const cues = Array.isArray(action.data.cues) ? (action.data.cues as string[]) : [];
  const lower = words(difficulty);
  const accented = fold(lower) !== lower;
  const haystack = ` ${accented ? lower : normalizeForMatch(difficulty)} `;
  return cues.filter((c) => {
    const needle = accented ? words(c) : normalizeForMatch(c);
    return needle && haystack.includes(` ${needle} `);
  });
}

/**
 * Tối đa 3 việc nhỏ. Có khó khăn đã xác nhận thì việc KHỚP KHÓ KHĂN đứng trước (khớp nhiều cụm từ hơn, cụm dài hơn
 * thì trước), rồi tới tối đa 2 việc theo chủ đề, rồi việc dùng chung. Nhờ vậy "chưa ôn xong" và "học rồi mà sợ quên"
 * ra hai việc khác nhau, dù cùng chủ đề học tập. Việc đã thử mà chưa đỡ và việc vượt mức lo thì bỏ.
 */
export function pickActions(items: SupportItem[], topic: string | null, ctx: PickContext = {}): SupportItem[] {
  const exclude = new Set(ctx.exclude ?? []);
  const actions = items
    .filter((i) => i.kind === "tiny_action" && !exclude.has(i.key))
    .filter((i) => typeof i.data.maxLevel !== "number" || !ctx.level || ctx.level <= (i.data.maxLevel as number))
    .sort(byOrder);
  const matched = ctx.difficulty
    ? actions
        .map((a) => ({ a, hits: cueHits(a, ctx.difficulty as string) }))
        .filter((m) => m.hits.length > 0 && (m.a.topic === null || m.a.topic === topic || topic === null))
        .sort((x, y) => y.hits.length - x.hits.length || Math.max(...y.hits.map((h) => h.length)) - Math.max(...x.hits.map((h) => h.length)))
        .map((m) => m.a)
    : [];
  const own = topic ? actions.filter((a) => a.topic === topic).slice(0, 2) : [];
  const general = actions.filter((a) => a.topic === null);
  return [...new Set([...matched, ...own, ...general])].slice(0, 3);
}

/** Câu mở lời với một người: câu theo chủ đề trước, rồi câu chung; tối đa 3 câu. */
export function openersFor(items: SupportItem[], who: Who, topic: string | null): string[] {
  const openers = items.filter((i) => i.kind === "opener" && i.data.who === who).sort(byOrder);
  const own = topic ? openers.filter((o) => o.topic === topic) : [];
  const general = openers.filter((o) => o.topic === null);
  return [...own, ...general].slice(0, 3).map((o) => String(o.data.text));
}
