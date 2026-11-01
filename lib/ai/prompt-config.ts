import "server-only";
import { getStyleSettings } from "@/lib/ai/style-settings";
import type { PromptConfig } from "@/lib/ai/prompts";
import { getSetting } from "@/lib/settings";

/**
 * Các phần lời dặn admin sửa (phần 2, 3, 5, 6) và câu chữ 4 nhóm lựa chọn (phần 4), đọc từ cài đặt đang dùng.
 * Dùng chung cho trò chuyện thật, sân thử của admin và các bộ thử.
 * Không còn danh sách kỹ năng cho thẻ [SKILL] (bỏ 01/11): thẻ chọn kỹ năng do máy chủ gắn.
 */
export async function getPromptConfig(): Promise<PromptConfig> {
  const [safety, talk, rules, cards, styles] = await Promise.all([
    getSetting("ai.safety"),
    getSetting("ai.talk"),
    getSetting("ai.rules"),
    getSetting("ai.cards"),
    getStyleSettings(),
  ]);
  return { safety: safety.text, talk: talk.text, rules: rules.text, cards: cards.text, styles };
}
