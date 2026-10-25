import "server-only";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { openai, safetyModel } from "@/lib/ai/openai";
import { timed } from "@/lib/ai/log";
import { getSetting } from "@/lib/settings";
import { LOCKED_CLASSIFIER_RULES } from "@/lib/ai/prompts";
import { keywordCheck, maxLevel, type RiskLevel } from "./keywords";
import { normalizeForMatch } from "./normalize";

export type SafetyResult = { level: RiskLevel; reasons: string[] };

type Turn = { role: "user" | "assistant"; content: string };

/** Kết quả chi tiết từng lớp (dùng cho trang "Phát hiện rủi ro" và "Bộ thử"). */
export type SafetyDetail = SafetyResult & {
  layers: { keyword: SafetyResult; classifier: SafetyResult | "error"; moderation: SafetyResult | "error" | "skipped" };
};

/** Lý do ghi lại khi AI phân loại không chạy được (mất mạng, hết hạn mức...). */
export const CLASSIFIER_DOWN_REASON = "Chưa kiểm tra được bằng AI nên tạm coi là cần để ý";

/** Chỉ lớp từ khóa (tức thì, không cần mạng). Dùng để báo động sớm khi đã rõ là nguy hiểm. */
export async function keywordLayer(message: string): Promise<SafetyResult> {
  return keywordCheck(message, await getSetting("safety.phrases"));
}

/**
 * Kiểm tra an toàn tin nhắn mới của học sinh qua 3 lớp, chạy song song:
 *  1. bộ lọc từ khóa: luôn được tính (không cần mạng, admin thêm cụm từ được)
 *  2. AI phân loại có xét bối cảnh hội thoại: lớp chính
 *  3. OpenAI Moderation: CHỈ dùng dự phòng khi lớp 2 lỗi
 *
 * Nguyên tắc "không chắc thì coi là cần để ý": nếu AI phân loại lỗi, kết quả
 * thấp nhất là "concern", không bao giờ là "none".
 *
 * Vì sao Moderation chỉ là dự phòng: khi thử với tiếng Việt, nó chấm câu nói quá
 * "mệt muốn chết luôn á" (0.80) cao hơn câu thật "muốn biến mất mãi mãi" (0.72),
 * và bỏ sót câu gián tiếp như "mình đã chuẩn bị thuốc rồi".
 */
export async function checkMessage(message: string, history: Turn[]): Promise<SafetyResult> {
  const { level, reasons } = await checkMessageDetailed(message, history);
  return { level, reasons };
}

export async function checkMessageDetailed(message: string, history: Turn[]): Promise<SafetyDetail> {
  const keyword = await keywordLayer(message);

  const [classifier, moderation] = await Promise.allSettled([
    classifierCheck(message, history),
    moderationCheck(message),
  ]);

  const results: SafetyResult[] = [keyword];
  let moderationLayer: SafetyDetail["layers"]["moderation"] = "skipped";
  if (classifier.status === "fulfilled") {
    results.push(classifier.value);
  } else {
    console.error("[F-Mood] Phân loại an toàn lỗi, dùng Moderation dự phòng", classifier.reason);
    results.push({ level: "concern", reasons: [CLASSIFIER_DOWN_REASON] });
    if (moderation.status === "fulfilled") {
      results.push(moderation.value);
      moderationLayer = moderation.value;
    } else {
      console.error("[F-Mood] Moderation cũng lỗi", moderation.reason);
      moderationLayer = "error";
    }
  }

  const combined = results.reduce<SafetyResult>(
    (acc, r) => ({
      level: maxLevel(acc.level, r.level),
      reasons: r.level === "none" ? acc.reasons : [...acc.reasons, ...r.reasons],
    }),
    { level: "none", reasons: [] },
  );
  return {
    ...combined,
    layers: {
      keyword,
      classifier: classifier.status === "fulfilled" ? classifier.value : "error",
      moderation: moderationLayer,
    },
  };
}

async function moderationCheck(message: string): Promise<SafetyResult> {
  const res = await timed("moderation", "omni-moderation-latest", () =>
    openai().moderations.create({ model: "omni-moderation-latest", input: message }),
  );
  const c = res.results[0]?.categories;
  if (!c) return { level: "none", reasons: [] };

  if (c["self-harm/intent"] || c["self-harm/instructions"]) {
    return { level: "urgent", reasons: ["Moderation: ý định tự làm hại bản thân"] };
  }
  if (c["sexual/minors"]) {
    return { level: "urgent", reasons: ["Moderation: nội dung tình dục liên quan trẻ vị thành niên"] };
  }
  if (c["self-harm"]) {
    return { level: "concern", reasons: ["Moderation: nhắc tới tự làm hại bản thân"] };
  }
  if (c["violence"] || c["harassment/threatening"]) {
    return { level: "concern", reasons: ["Moderation: nhắc tới bạo lực / đe dọa"] };
  }
  return { level: "none", reasons: [] };
}

/** Trò chuyện đang chờ kết quả này: không đợi quá lâu, lỗi thì coi là "concern" (ở trên). */
const CLASSIFIER_REQUEST = { timeout: 10_000, maxRetries: 1 };

const Classification = z.object({
  risk: z.enum(["none", "concern", "urgent"]),
  reasons: z.array(z.string()),
});

async function classifierCheck(message: string, history: Turn[]): Promise<SafetyResult> {
  const context = history
    .slice(-6)
    .map((t) => `${t.role === "user" ? "Học sinh" : "Mây"}: ${t.content}`)
    .join("\n");
  const [model, { prompt }] = await Promise.all([safetyModel(), getSetting("safety.classifier")]);

  const res = await timed(
    "classifier",
    model,
    () =>
      openai().responses.parse(
        {
          model,
          instructions: prompt + LOCKED_CLASSIFIER_RULES,
          input:
            `${context ? `BỐI CẢNH:\n${context}\n\n` : ""}TIN NHẮN CUỐI CỦA HỌC SINH:\n${message}` +
            `\n\nBẢN CHUẨN HÓA (bỏ dấu, mở viết tắt, chỉ để tham khảo):\n${normalizeForMatch(message)}`,
          text: { format: zodTextFormat(Classification, "classification") },
          reasoning: { effort: "low" },
          store: false,
        },
        CLASSIFIER_REQUEST,
      ),
    (r) => ({ input: r.usage?.input_tokens, output: r.usage?.output_tokens }),
  );
  const parsed = res.output_parsed;
  if (!parsed) throw new Error("Không đọc được kết quả phân loại");
  return {
    level: parsed.risk,
    reasons: parsed.risk === "none" ? [] : parsed.reasons.map((r) => `AI: ${r}`),
  };
}
