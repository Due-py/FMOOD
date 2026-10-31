import "server-only";
import { chatModel, openai } from "@/lib/ai/openai";
import { defaultStyle, LENGTH_CAPS, type ChatStyle } from "@/lib/ai/chat-style";
import { getPromptConfig } from "@/lib/ai/prompt-config";
import { buildCompanionPrompt } from "@/lib/ai/prompts";
import { stripCardLines } from "@/lib/ai/reply-cards";
import { searchKnowledge } from "@/lib/kb";
import { blockedReplyFor, guardReply, lamHo, type LamHoKind } from "@/lib/safety/reply-guard";
import { activeScenarios, matchScenarios } from "@/lib/scenarios";
import type { LamHoCase } from "./khong-lam-ho-cases";
import { labelsStudent, type QuyKetCase } from "./khong-quy-ket-cases";

// CHẠY BỘ "KHÔNG LÀM HỘ" VÀ "ĐỪNG VỘI KẾT LUẬN" (kế hoạch Demo 3, mục 2.3, 2.5): mỗi kịch bản là một cuộc trò chuyện
// nhiều lượt với đúng lời dặn, tính cách, kịch bản theo chủ đề, tài liệu và tham số đang dùng thật trên web
// (giống lib/eval/reply-run.ts, nhưng nhiều lượt). Mỗi lượt ghi NGUYÊN VĂN câu AI viết (trước bộ kiểm tra),
// câu học sinh sẽ thấy (sau bộ kiểm tra), và kết quả máy chấm. Không ghi gì vào cơ sở dữ liệu.
// Không chạy kiểm tra an toàn từng lượt (các ca không có câu nguy hiểm; an toàn có bộ thử riêng).

const HISTORY_LIMIT = 20;

export type EvalTurn = {
  hocSinh: string;
  /** câu AI viết, nguyên văn */
  aiViet: string;
  /** câu học sinh thấy sau bộ kiểm tra câu trả lời (bị chặn thì là câu thay thế) */
  hienRa: string;
  chan: string[];
  /** máy chấm: loại làm hộ trên câu AI viết (null = không thấy) */
  lamHo: LamHoKind | null;
  /** máy chấm: có gán tính cách / bệnh không */
  ganNhan: boolean;
  hoiLai: boolean;
};

export type EvalRun = { id: string; luot: EvalTurn[]; loi?: string };

/** Cài đặt đang dùng thật; `style` là tổ hợp nhân vật / lựa chọn muốn thử (bỏ trống: mặc định admin đặt). */
export async function evalSettings(style?: ChatStyle | null) {
  const [model, config, scenarios] = await Promise.all([chatModel(), getPromptConfig(), activeScenarios()]);
  return { model, config, style: style ?? defaultStyle(config.styles), scenarios };
}
type Settings = Awaited<ReturnType<typeof evalSettings>>;

async function runConversation(id: string, turns: string[], s: Settings): Promise<EvalRun> {
  const history: { role: "user" | "assistant"; content: string }[] = [];
  const out: EvalTurn[] = [];
  try {
    for (const text of turns) {
      const recent = history.slice(-HISTORY_LIMIT);
      const matchText = [...recent.slice(-2).map((h) => h.content), text].join(" ");
      const instructions = buildCompanionPrompt(s.config, s.style, "Bạn thử", {
        scenarios: matchScenarios(matchText, s.scenarios),
        knowledge: await searchKnowledge(text),
      });
      const res = await openai().responses.create({
        model: s.model,
        instructions,
        input: [...recent, { role: "user" as const, content: text }],
        reasoning: { effort: "low" },
        max_output_tokens: LENGTH_CAPS[s.style.length].maxOutputTokens,
        store: false,
      });
      const raw = res.output_text;
      // cùng bộ kiểm tra câu trả lời trước khi hiện như trên web (có kiểm tra không làm hộ); chỉ chấm câu văn, không chấm dòng thẻ
      const guard = guardReply(stripCardLines(raw), text);
      const shown = guard.ok ? raw : blockedReplyFor(guard.reasons);
      // máy chấm làm hộ so với MỌI lời học sinh từ đầu kịch bản (việc có thể kể ở lượt trước, nài ở lượt sau)
      const allStudent = [...history.filter((h) => h.role === "user").map((h) => h.content), text].join("\n");
      const prose = stripCardLines(raw);
      out.push({ hocSinh: text, aiViet: raw, hienRa: guard.ok ? prose : shown, chan: guard.reasons, lamHo: lamHo(allStudent, prose), ganNhan: labelsStudent(prose), hoiLai: /\?/.test(prose) });
      history.push({ role: "user", content: text }, { role: "assistant", content: shown });
    }
    return { id, luot: out };
  } catch (e) {
    // lỗi gọi AI thì ghi lại (không bỏ qua cho đẹp số)
    return { id, luot: out, loi: e instanceof Error ? e.message.slice(0, 160) : "lỗi" };
  }
}

/** Chạy cả bộ, 4 kịch bản cùng lúc. */
export async function runSuite(cases: (LamHoCase | QuyKetCase)[], s: Settings): Promise<EvalRun[]> {
  const results: EvalRun[] = [];
  for (let i = 0; i < cases.length; i += 4) {
    results.push(...(await Promise.all(cases.slice(i, i + 4).map((c) => runConversation(c.id, c.luot, s)))));
  }
  return results;
}
