import "server-only";
import { chatModel, openai } from "@/lib/ai/openai";
import { defaultStyle, LENGTH_CAPS, styleRef, type ChatStyle } from "@/lib/ai/chat-style";
import { getPromptConfig } from "@/lib/ai/prompt-config";
import { buildCompanionPrompt } from "@/lib/ai/prompts";
import { CARD_KINDS, parseReplyCards, stripCardLines, type CardKind } from "@/lib/ai/reply-cards";
import { checkMessage } from "@/lib/safety/check";
import { IN_FLOW_STATE, maxQuestions, moveInstruction, selStep, SKILL_CARD_MOVES, type SelMove, type SelState } from "@/lib/sel/engine";
import { limitQuestions } from "@/lib/sel/questions";
import { searchKnowledge } from "@/lib/kb";
import { activeScenarios, matchScenarios } from "@/lib/scenarios";
import { BASE_CHECKS, checkReply, type ReplyCheck } from "./reply-checks";
import { CARD_CASES, REPLY_CASES } from "./reply-cases";
import { SEL_CASES } from "./sel-cases";

// CHẠY BỘ THỬ CÂU TRẢ LỜI: gửi từng tin nhắn mẫu cho trợ lý với đúng lời dặn 9 phần, kịch bản và tài liệu
// đang dùng thật (giống ô "Thử nói chuyện" ở trang Lời dặn), rồi chấm bằng máy chấm reply-checks.
// Truyền `style` để chạy với một tổ hợp nhân vật / độ dài / cách dẫn dắt / động lực (Bước 9.6); bỏ trống thì dùng
// mức mặc định admin đặt. Máy chấm "ngắn gọn" dùng giới hạn từ của mức độ dài đang thử.

export { REPLY_RUN_PREFIX } from "./reply-checks";

export type ReplyResult = { id: string; message: string; reply: string; ok: boolean; failed: ReplyCheck[]; error?: string };

/** Một câu trả lời thật (nguyên văn, có thể có dòng thẻ). `concern`: dùng lời dặn lượt đáng lo. */
export async function generateReply(
  message: string,
  style?: ChatStyle | null,
  {
    concern = false,
    history = [],
    selLine = "",
  }: { concern?: boolean; history?: { role: "user" | "assistant"; content: string }[]; selLine?: string } = {},
): Promise<{ reply: string; style: ChatStyle }> {
  const [config, scenarios, knowledge, model] = await Promise.all([getPromptConfig(), activeScenarios(), searchKnowledge(message), chatModel()]);
  const used = style ?? defaultStyle(config.styles);
  const instructions = buildCompanionPrompt(config, used, "Bạn thử", { scenarios: matchScenarios(message, scenarios), knowledge, concern });
  const res = await openai().responses.create({
    model,
    instructions: selLine ? `${instructions}\n\n${selLine}` : instructions,
    input: history.length ? [...history, { role: "user" as const, content: message }] : message,
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

export type SelPrepared = { id: string; level: string; move: SelMove | null; state: SelState; moveOk: boolean | null };

/**
 * Bộ thử mạch SEL, phần 1 (một lần cho mọi nhân vật): dựng lại trạng thái từ các lượt trước và chọn bước cho tin cuối,
 * qua đúng lời gọi AI an toàn + bộ điều phối như trên web (app/api/chat/route.ts).
 */
export async function prepareSelCases(): Promise<Map<string, SelPrepared>> {
  const out = new Map<string, SelPrepared>();
  await Promise.all(
    SEL_CASES.map(async (c) => {
      // các ca lấy từ đối thoại mẫu: học sinh đã đồng ý cùng gỡ từng bước (phần mời vào mạch có test riêng)
      let state = IN_FLOW_STATE;
      for (let i = 0; i < c.history.length; i++) {
        const t = c.history[i];
        if (t.role !== "user") continue;
        const r = await checkMessage(t.content, c.history.slice(0, i));
        if (r.sel) state = selStep(state, r.sel, r.level).state;
        else state = { ...state, moves: [...state.moves, "mo"] };
      }
      const safety = await checkMessage(c.message, c.history);
      const step = safety.sel ? selStep(state, safety.sel, safety.level) : null;
      out.set(c.id, {
        id: c.id,
        level: safety.level,
        move: step?.move ?? null,
        state: step?.state ?? state,
        moveOk: c.expectMove ? Boolean(step && c.expectMove.includes(step.move)) : null,
      });
    }),
  );
  return out;
}

/** Bộ thử mạch SEL, phần 2 (mỗi nhân vật): viết câu trả lời theo bước đã chọn, áp chốt một câu hỏi và luật thẻ kỹ năng như trên web. */
export async function runSelSuite(
  style: ChatStyle,
  prepared: Map<string, SelPrepared>,
): Promise<{ results: (ReplyResult & { step: string; note: string; move: SelMove | null; expect: SelMove[] | null; moveOk: boolean | null; level: string })[]; passed: number; total: number }> {
  const maxWords = LENGTH_CAPS[style.length].words;
  const results = await Promise.all(
    SEL_CASES.map(async (c) => {
      const p = prepared.get(c.id);
      const gentle = p ? p.level !== "none" : Boolean(c.concern);
      const move = p?.move ?? null;
      const base = { id: c.id, step: c.step, note: c.note, message: c.message, move, expect: c.expectMove ?? null, moveOk: p?.moveOk ?? null, level: p?.level ?? "?" };
      try {
        const selLine = move && !gentle && p ? moveInstruction(move, p.state) : "";
        const { reply: raw } = await generateReply(c.message, style, { concern: gentle, history: c.history, selLine });
        let reply = limitQuestions(raw, move && !gentle ? maxQuestions(move) : 1);
        const skillOk = move ? SKILL_CARD_MOVES.includes(move) : c.history.length > 0;
        if (gentle) reply = stripCardLines(reply);
        else if (!skillOk) reply = reply.split("\n").filter((l) => !/^\s*\[SKILL:/.test(l)).join("\n").trimEnd();
        const failed = checkReply(reply, [...BASE_CHECKS, ...c.checks], { maxWords }).filter((r) => !r.ok).map((r) => r.check);
        return { ...base, reply, ok: failed.length === 0 && base.moveOk !== false, failed };
      } catch (e) {
        return { ...base, reply: "", ok: false, failed: [], error: e instanceof Error ? e.message.slice(0, 120) : "lỗi" };
      }
    }),
  );
  return { results, passed: results.filter((r) => r.ok).length, total: results.length };
}
