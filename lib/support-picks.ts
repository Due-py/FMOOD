// Chọn việc nhỏ và câu mở lời hợp với chuyện bận lòng (dùng chung máy chủ và trình duyệt).
import type { SupportItem } from "./support-content";

export const WHO = ["parent", "teacher", "friend", "other"] as const;
export type Who = (typeof WHO)[number];

export function isWho(value: string): value is Who {
  return (WHO as readonly string[]).includes(value);
}

const byOrder = (a: SupportItem, b: SupportItem) => a.sortOrder - b.sortOrder;

/** Tối đa 2 việc nhỏ theo chủ đề, rồi thêm việc dùng chung cho đủ 3. */
export function pickActions(items: SupportItem[], topic: string | null): SupportItem[] {
  const actions = items.filter((i) => i.kind === "tiny_action").sort(byOrder);
  const own = topic ? actions.filter((a) => a.topic === topic).slice(0, 2) : [];
  const general = actions.filter((a) => a.topic === null);
  return [...own, ...general].slice(0, 3);
}

/** Câu mở lời với một người: câu theo chủ đề trước, rồi câu chung; tối đa 3 câu. */
export function openersFor(items: SupportItem[], who: Who, topic: string | null): string[] {
  const openers = items.filter((i) => i.kind === "opener" && i.data.who === who).sort(byOrder);
  const own = topic ? openers.filter((o) => o.topic === topic) : [];
  const general = openers.filter((o) => o.topic === null);
  return [...own, ...general].slice(0, 3).map((o) => String(o.data.text));
}
