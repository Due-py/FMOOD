import "server-only";
import { chatModel, openai } from "@/lib/ai/openai";
import { defaultStyle, LENGTH_CAPS, type ChatStyle } from "@/lib/ai/chat-style";
import { getPromptConfig } from "@/lib/ai/prompt-config";
import { buildCompanionPrompt, withoutLoopRules, type PromptConfig, type TurnMode, type WorryContext } from "@/lib/ai/prompts";
import { stripCardLines } from "@/lib/ai/reply-cards";
import { STOP_LINE } from "@/lib/chat-loop";
import { searchKnowledge } from "@/lib/kb";
import { checkMessage } from "@/lib/safety/check";
import { crisisResponse } from "@/lib/safety/crisis";
import { crisisWithStatus } from "@/lib/safety/crisis-text";
import type { RiskLevel } from "@/lib/safety/keywords";
import { BLOCKED_REPLY, guardReply } from "@/lib/safety/reply-guard";
import { activeScenarios, matchScenarios, type Scenario } from "@/lib/scenarios";
import type { Config } from "./ab";
import type { AbScenario } from "./ab-scenarios";

// CHẠY MỘT KỊCH BẢN NHIỀU LƯỢT với một kiểu trợ lý. Hai kiểu dùng CÙNG mô hình, cùng tham số (mức suy luận thấp,
// tối đa 1.200 token, tắt lưu hội thoại phía nhà cung cấp), cùng tính cách, cùng ba lớp kiểm tra an toàn,
// cùng kịch bản theo chủ đề và tài liệu tham khảo, cùng 20 tin gần nhất. Chỉ khác:
//   A: lời dặn bỏ QT03–QT08; không có bối cảnh chuyện bận lòng; không có nút (lời học sinh vẫn y hệt).
//   B: lời dặn đủ; có khó khăn đã xác nhận, việc đã thử; nút "… hiểu chưa đúng" / "Bỏ qua" / "Dừng" như trên web.
// Không ghi gì vào cơ sở dữ liệu, không tạo cảnh báo (câu nguy hiểm dùng câu soạn sẵn bản "chưa báo được").

const HISTORY_LIMIT = 20;

export type AbSettings = {
  model: string;
  /** lời dặn 9 phần đang dùng (phần 5 là quy tắc QT) */
  config: PromptConfig;
  /** tổ hợp mặc định admin đặt */
  style: ChatStyle;
  scenarios: Scenario[];
  crisis: string;
};

export async function abSettings(): Promise<AbSettings> {
  const [model, config, scenarios, crisis] = await Promise.all([chatModel(), getPromptConfig(), activeScenarios(), crisisResponse()]);
  return { model, config, style: defaultStyle(config.styles), scenarios, crisis };
}

export type AbTurnResult = { hocSinh: string; nut: string | null; may: string; mucAnToan: RiskLevel | "khong-kiem-tra"; soanSan: boolean; chan: boolean };

export async function runAbConversation(sc: AbScenario, config: Config, s: AbSettings): Promise<AbTurnResult[]> {
  const history: { role: "user" | "assistant"; content: string }[] = [];
  const out: AbTurnResult[] = [];
  let difficulty = sc.boiCanh?.khoKhan ?? null;
  let afterCrisis = false;

  for (const turn of sc.luot) {
    const recent = history.slice(-HISTORY_LIMIT);
    // B: nút "Dừng" trên web không gọi AI, trợ lý chào bằng câu soạn sẵn
    if (config === "B" && turn.nut === "stop") {
      out.push({ hocSinh: turn.text, nut: turn.nut, may: STOP_LINE, mucAnToan: "khong-kiem-tra", soanSan: true, chan: false });
      history.push({ role: "user", content: turn.text }, { role: "assistant", content: STOP_LINE });
      continue;
    }
    const safety = await checkMessage(turn.text, recent);
    if (safety.level === "urgent") {
      const text = crisisWithStatus(s.crisis, false);
      out.push({ hocSinh: turn.text, nut: turn.nut ?? null, may: text, mucAnToan: "urgent", soanSan: true, chan: false });
      history.push({ role: "user", content: turn.text }, { role: "assistant", content: text });
      afterCrisis = true;
      continue;
    }
    const worry: WorryContext | undefined =
      config === "B"
        ? sc.boiCanh
          ? { topicLabel: sc.boiCanh.chuDe, level: sc.boiCanh.mucLo, difficulty, tried: sc.boiCanh.daThu ?? [] }
          : difficulty
            ? { topicLabel: null, level: null, difficulty }
            : undefined
        : undefined;
    const buttonTurn: TurnMode | undefined = config === "B" && (turn.nut === "correction" || turn.nut === "skip") ? turn.nut : undefined;
    const matchText = [...recent.slice(-2).map((h) => h.content), turn.text].join(" ");
    const instructions = buildCompanionPrompt({ ...s.config, rules: config === "A" ? withoutLoopRules(s.config.rules) : s.config.rules }, s.style, "Bạn thử", {
      concern: safety.level === "concern" || afterCrisis,
      scenarios: matchScenarios(matchText, s.scenarios),
      knowledge: await searchKnowledge(turn.text),
      worry,
      turn: buttonTurn,
    });
    const res = await openai().responses.create({
      model: s.model,
      instructions,
      input: [...recent, { role: "user" as const, content: turn.text }],
      reasoning: { effort: "low" },
      max_output_tokens: LENGTH_CAPS[s.style.length].maxOutputTokens,
      store: false,
    });
    // cùng bộ kiểm tra câu trả lời trước khi hiện như trên web
    const prose = stripCardLines(res.output_text);
    const blocked = !guardReply(prose).ok;
    const reply = blocked ? BLOCKED_REPLY : prose;
    out.push({ hocSinh: turn.text, nut: turn.nut ?? null, may: reply, mucAnToan: safety.level, soanSan: false, chan: blocked });
    history.push({ role: "user", content: turn.text }, { role: "assistant", content: reply });
    // B: học sinh bấm "Đúng rồi" với câu tóm tắt sau lượt này → khó khăn đã xác nhận cho các lượt sau
    if (config === "B" && turn.xacNhan) difficulty = turn.xacNhan;
  }
  return out;
}
