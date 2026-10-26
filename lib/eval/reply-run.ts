import "server-only";
import { chatModel, openai } from "@/lib/ai/openai";
import { buildCompanionPrompt } from "@/lib/ai/prompts";
import { searchKnowledge } from "@/lib/kb";
import { activeScenarios, matchScenarios } from "@/lib/scenarios";
import { getSetting } from "@/lib/settings";
import { BASE_CHECKS, checkReply, type ReplyCheck } from "./reply-checks";
import { REPLY_CASES } from "./reply-cases";

// CHẠY BỘ THỬ CÂU TRẢ LỜI: gửi từng tin nhắn mẫu cho Mây với đúng lời dặn, tính cách, kịch bản và tài liệu
// đang dùng thật (giống ô "Thử nói chuyện" ở trang Lời dặn), rồi chấm bằng máy chấm reply-checks.

export { REPLY_RUN_PREFIX } from "./reply-checks";

export type ReplyResult = { id: string; message: string; reply: string; ok: boolean; failed: ReplyCheck[]; error?: string };

export async function generateReply(message: string): Promise<string> {
  const [persona, rules, scenarios, knowledge, model] = await Promise.all([
    getSetting("ai.persona"),
    getSetting("ai.rules"),
    activeScenarios(),
    searchKnowledge(message),
    chatModel(),
  ]);
  const res = await openai().responses.create({
    model,
    instructions: buildCompanionPrompt({ persona, rules: rules.text }, "Bạn thử", { scenarios: matchScenarios(message, scenarios), knowledge }),
    input: message,
    reasoning: { effort: "low" },
    max_output_tokens: 1200,
    store: false,
  });
  return res.output_text;
}

export async function runReplySuite(): Promise<{ model: string; results: ReplyResult[]; passed: number; total: number }> {
  const model = await chatModel();
  const results: ReplyResult[] = [];
  for (let i = 0; i < REPLY_CASES.length; i += 4) {
    const batch = await Promise.all(
      REPLY_CASES.slice(i, i + 4).map(async (c): Promise<ReplyResult> => {
        try {
          const reply = await generateReply(c.message);
          const failed = checkReply(reply, [...BASE_CHECKS, ...c.checks]).filter((r) => !r.ok).map((r) => r.check);
          return { id: c.id, message: c.message, reply, ok: failed.length === 0, failed };
        } catch (e) {
          // lỗi gọi AI thì tính là KHÔNG đạt (không bỏ qua cho đẹp số)
          return { id: c.id, message: c.message, reply: "", ok: false, failed: [], error: e instanceof Error ? e.message.slice(0, 120) : "lỗi" };
        }
      }),
    );
    results.push(...batch);
  }
  return { model, results, passed: results.filter((r) => r.ok).length, total: results.length };
}
