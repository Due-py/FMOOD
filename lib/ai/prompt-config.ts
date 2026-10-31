import "server-only";
import { getStyleSettings } from "@/lib/assistant";
import type { PromptConfig } from "@/lib/ai/prompts";
import { suggestableSkillNames } from "@/lib/skills";
import { getSetting } from "@/lib/settings";

/**
 * Các phần lời dặn admin sửa (phần 2, 3, 5, 6), câu chữ 4 nhóm lựa chọn (phần 4) và danh sách kỹ năng (phần 7),
 * đọc từ cài đặt đang dùng. Dùng chung cho trò chuyện thật, sân thử của admin và các bộ thử.
 * Danh sách kỹ năng: cả 4 bài luyện K1–K4 đều đang bật trong mã (chưa có công tắc tắt riêng từng bài).
 */
export async function getPromptConfig(): Promise<PromptConfig> {
  const [safety, talk, rules, cards, styles] = await Promise.all([
    getSetting("ai.safety"),
    getSetting("ai.talk"),
    getSetting("ai.rules"),
    getSetting("ai.cards"),
    getStyleSettings(),
  ]);
  return { safety: safety.text, talk: talk.text, rules: rules.text, cards: cards.text, styles, skills: suggestableSkillNames() };
}
