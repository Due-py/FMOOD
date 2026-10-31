import "server-only";
import { chatModel, openai } from "@/lib/ai/openai";
import { defaultStyle, LENGTH_CAPS, styleRef, type ChatStyle } from "@/lib/ai/chat-style";
import { getPromptConfig } from "@/lib/ai/prompt-config";
import { buildCompanionPrompt } from "@/lib/ai/prompts";
import { CARD_KINDS, parseReplyCards, type CardKind } from "@/lib/ai/reply-cards";
import { searchKnowledge } from "@/lib/kb";
import { activeScenarios, matchScenarios } from "@/lib/scenarios";
import { BASE_CHECKS, checkReply, type ReplyCheck } from "./reply-checks";
import { CARD_CASES, REPLY_CASES } from "./reply-cases";

// CHẠY BỘ THỬ CÂU TRẢ LỜI: gửi từng tin nhắn mẫu cho trợ lý với đúng lời dặn 9 phần, kịch bản và tài liệu
// đang dùng thật (giống ô "Thử nói chuyện" ở trang Lời dặn), rồi chấm bằng máy chấm reply-checks.
// Truyền `style` để chạy với một tổ hợp nhân vật / độ dài / cách dẫn dắt / động lực (Bước 9.6); bỏ trống thì dùng
// mức mặc định admin đặt. Máy chấm "ngắn gọn" dùng giới hạn từ của mức độ dài đang thử.

export { REPLY_RUN_PREFIX } from "./reply-checks";

export type ReplyResult = { id: string; message: string; reply: string; ok: boolean; failed: ReplyCheck[]; error?: string };

/** Một câu trả lời thật (nguyên văn, có thể có dòng thẻ). `concern`: dùng lời dặn lượt đáng lo. */
export async function generateReply(message: string, style?: ChatStyle | null, { concern = false } = {}): Promise<{ reply: string; style: ChatStyle }> {
  const [config, scenarios, knowledge, model] = await Promise.all([getPromptConfig(), activeScenarios(), searchKnowledge(message), chatModel()]);
  const used = style ?? defaultStyle(config.styles);
  const res = await openai().responses.create({
    model,
    instructions: buildCompanionPrompt(config, used, "Bạn thử", { scenarios: matchScenarios(message, scenarios), knowledge, concern }),
    input: message,
    reasoning: { effort: "low" },
    max_output_tokens: LENGTH_CAPS[used.length].maxOutputTokens,
    store: false,
  });
  return { reply: res.output_text, style: used };
}

export async function runReplySuite(
  style?: ChatStyle | null,
): Promise<{ model: string; style: string; results: ReplyResult[]; passed: number; total: number }> {
  const model = await chatModel();
  const used = style ?? defaultStyle((await getPromptConfig()).styles);
  const maxWords = LENGTH_CAPS[used.length].words;
  const results: ReplyResult[] = [];
  for (let i = 0; i < REPLY_CASES.length; i += 4) {
    const batch = await Promise.all(
      REPLY_CASES.slice(i, i + 4).map(async (c): Promise<ReplyResult> => {
        try {
          const { reply } = await generateReply(c.message, used);
          const failed = checkReply(reply, [...BASE_CHECKS, ...c.checks], { maxWords }).filter((r) => !r.ok).map((r) => r.check);
          return { id: c.id, message: c.message, reply, ok: failed.length === 0, failed };
        } catch (e) {
          // lỗi gọi AI thì tính là KHÔNG đạt (không bỏ qua cho đẹp số)
          return { id: c.id, message: c.message, reply: "", ok: false, failed: [], error: e instanceof Error ? e.message.slice(0, 120) : "lỗi" };
        }
      }),
    );
    results.push(...batch);
  }
  return { model, style: styleRef(used), results, passed: results.filter((r) => r.ok).length, total: results.length };
}

export type CardResult = { id: string; message: string; expect: CardKind | "none"; reply: string; got: CardKind[]; ok: boolean; error?: string };

/**
 * Bộ 6 ca thẻ gợi ý (Bước 10.5): 2 ca nên có GOAL, 2 ca nên có SKILL, 1 ca nên có END, 1 ca đáng lo không được có thẻ.
 * Chấm trên câu AI viết, TRƯỚC khi máy chủ bỏ thẻ ở lượt đáng lo (để biết lời dặn có hiệu quả không).
 * Đạt khi: ca "none" không có thẻ nào; ca khác có đúng loại thẻ mong đợi.
 */
export async function runCardSuite(style?: ChatStyle | null): Promise<{ results: CardResult[]; passed: number; total: number }> {
  const results = await Promise.all(
    CARD_CASES.map(async (c): Promise<CardResult> => {
      try {
        // ca mục tiêu cần học sinh "muốn thay đổi" hoặc mức động lực cho phép; giữ nguyên tổ hợp được truyền
        const { reply } = await generateReply(c.message, style, { concern: c.expect === "none" });
        const { cards } = parseReplyCards(reply);
        const got = CARD_KINDS.filter((k) => cards[k]);
        const ok = c.expect === "none" ? got.length === 0 : got.includes(c.expect);
        return { id: c.id, message: c.message, expect: c.expect, reply, got, ok };
      } catch (e) {
        return { id: c.id, message: c.message, expect: c.expect, reply: "", got: [], ok: false, error: e instanceof Error ? e.message.slice(0, 120) : "lỗi" };
      }
    }),
  );
  return { results, passed: results.filter((r) => r.ok).length, total: results.length };
}
