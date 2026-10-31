import "server-only";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { openai, safetyModel } from "@/lib/ai/openai";
import { timed } from "@/lib/ai/log";
import { getSetting } from "@/lib/settings";
import { LOCKED_CLASSIFIER_RULES } from "@/lib/ai/prompts";
import { keywordCheck, maxLevel, type RiskLevel } from "./keywords";
import { normalizeForMatch } from "./normalize";
import { levelFromSignals, type Signals, type Stress } from "./signals";
import type { SelExtract } from "@/lib/sel/engine";

/**
 * `stress` (trục 2: mức ảnh hưởng của căng thẳng) chỉ có khi AI phân loại chạy được; nó quyết định giọng trả lời
 * và khung "người lắng nghe", KHÔNG bao giờ đổi `level` (mức nguy cơ).
 */
export type SafetyResult = { level: RiskLevel; reasons: string[]; stress?: Stress; signals?: Signals; sel?: SelExtract };

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
 * AN TOÀN HAI TRỤC (P0): mức nguy cơ chỉ xét từ CHỮ học sinh viết (và các tin trước đó). Mức ảnh hưởng của căng thẳng,
 * mức lo học sinh tự chọn, cảm xúc check-in KHÔNG được truyền vào đây, nên không làm tăng hay giảm mức nguy cơ
 * (test: lib/safety/hai-truc.test.ts).
 *
 * Nguyên tắc "không chắc thì coi là cần để ý": nếu AI phân loại lỗi, kết quả
 * thấp nhất là "concern", không bao giờ là "none".
 *
 * Vì sao Moderation chỉ là dự phòng: khi thử với tiếng Việt, nó chấm câu nói quá
 * "mệt muốn chết luôn á" (0.80) cao hơn câu thật "muốn biến mất mãi mãi" (0.72),
 * và bỏ sót câu gián tiếp như "mình đã chuẩn bị thuốc rồi".
 */
export async function checkMessage(message: string, history: Turn[]): Promise<SafetyResult> {
  const { level, reasons, stress, signals, sel } = await checkMessageDetailed(message, history);
  return { level, reasons, stress, signals, sel };
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
    ...(classifier.status === "fulfilled" ? { stress: classifier.value.stress, signals: classifier.value.signals, sel: classifier.value.sel } : {}),
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

// Dấu hiệu AI đánh dấu (định nghĩa đi kèm schema để AI luôn thấy, kể cả khi admin sửa lời dặn). Mức nguy cơ do bảng
// quy tắc ở signals.ts xếp, không do AI chọn.
const yes = (d: string) => z.boolean().describe(d);
const Classification = z.object({
  self_harm: z
    .enum(["none", "hint", "explicit"])
    .describe("Ý nghĩ, ý định, kế hoạch tự tử / tự làm hại. explicit = nói rõ; hint = ám chỉ, vòng vo, hoặc PHÂN VÂN; none = không có hoặc chắc chắn chỉ là nói quá"),
  abuse: yes("Đang bị bạo hành (bị người lớn đánh đập, hành hạ), xâm hại tình dục, bị ép hoặc dụ gửi ảnh riêng tư"),
  danger_now: yes("Đang trong nguy hiểm ngay lúc này"),
  harm_others: yes("Có ý định làm hại người khác nghiêm trọng (không tính nói quá lúc bực)"),
  bullied_repeatedly: yes(
    "Bị trêu chọc, chê bai, làm nhục, nói xấu LẶP LẠI hoặc kéo dài (nhiều lần, ngày nào cũng, toàn, suốt, lần nào cũng), hoặc học sinh tự gọi là bị bắt nạt. MỘT LẦN bị chê / trêu / nói xấu là false",
  ),
  humiliated_publicly: yes(
    "Bị làm nhục công khai: người khác chế, đăng lại, phát tán ảnh / clip / tin đồn về mình cho nhiều người (nhóm lớp, mạng xã hội), hoặc nhiều người hùa vào chê kéo dài. Một bình luận chê dưới bài mình tự đăng là false",
  ),
  threatened_or_hit: yes("Bị đe dọa, tống tiền, chặn đường, hoặc bị đánh (kể cả một lần)"),
  excluded: yes("Bị cô lập, tẩy chay, cả nhóm / cả lớp không chơi cùng một thời gian dài. Một lần bị quên rủ là false"),
  feels_unsafe: yes("Sợ, không dám đến trường hoặc về nhà, thấy không an toàn ở đó"),
  hopeless: yes(
    "Tuyệt vọng, thấy mình vô dụng / là gánh nặng / chán bản thân, khóc nhiều ngày liền, KÉO DÀI: có \"dạo này\", \"mấy hôm nay\", \"lâu rồi\", \"tuần nay\", \"lúc nào cũng\" là kéo dài. Buồn hay tự trách một lúc vì một chuyện là false",
  ),
  eating_harm: yes("Nhịn ăn, ép cân, nôn sau ăn có dấu hiệu nguy hại"),
  stress: z
    .enum(["nhe", "vua", "nang"])
    .describe("Mức ảnh hưởng của căng thẳng lên học sinh lúc này (chỉ để chọn giọng trả lời, không phải mức nguy hiểm)"),
  note: z.string().describe("Một lý do ngắn bằng tiếng Việt (tối đa 15 từ), không trích nguyên văn tin nhắn; để trống nếu không có dấu hiệu"),
  // Nhận diện lượt cho bộ điều phối SEL (lib/sel/engine.ts): chỉ điều học sinh TỰ NÓI trong tin nhắn cuối, không suy đoán.
  // Phần này KHÔNG được dùng để xếp mức an toàn.
  sel: z
    .object({
      difficulty: z
        .boolean()
        .describe(
          "Học sinh đang kể một chuyện khó với mình: cảm xúc khó chịu (lo, sợ, buồn, bực, xấu hổ, áp lực…) hoặc một việc đang làm mình khó xử. Chào hỏi, chuyện vui, chuyện phiếm, hỏi bài đơn thuần là false",
        ),
      emotion: z.string().describe("Từ cảm xúc học sinh tự nói ra trong tin cuối (lo, sợ, xấu hổ, buồn, bực…), ngắn; rỗng nếu không nói"),
      emotion_vague: z
        .boolean()
        .describe("Từ cảm xúc đó có thể mang nhiều nghĩa hoặc chung chung (xấu hổ, khó chịu, tệ, không ổn, chán) nên cần hỏi lại cho rõ"),
      emotion_unsure: z.boolean().describe("Học sinh nói chưa biết / không phân biệt được mình đang thấy gì"),
      body: z.string().describe("Biểu hiện cơ thể học sinh tự tả (tim đập nhanh, tay run, mặt nóng, đầu óc trống rỗng…); rỗng nếu không"),
      thought: z.string().describe("Suy nghĩ hoặc điều học sinh đoán sẽ xảy ra, đúng ý học sinh, ngắn; rỗng nếu không"),
      thought_is_prediction: z.boolean().describe("Suy nghĩ đó là đoán trước một điều CHƯA xảy ra"),
      event: z.string().describe("Sự việc đã xảy ra mà học sinh kể, ngắn; rỗng nếu không"),
      happened_to_me: z.boolean().describe("Chuyện tiêu cực đã THẬT SỰ xảy ra với chính học sinh (từng bị cười, bị chê…), không phải chuyện chứng kiến hay lo sẽ xảy ra"),
      confirms: z.boolean().describe("Học sinh đồng ý với điều trợ lý vừa nói lại hoặc vừa hỏi xin phép (đúng rồi, ừ, được, có)"),
      declines: z.boolean().describe("Học sinh không đồng ý với điều trợ lý vừa nói hoặc vừa xin phép (không phải, không muốn)"),
      wants_solution: z.boolean().describe("Học sinh hỏi cách làm / muốn giải pháp ngay"),
      refuses: z.boolean().describe("Học sinh không muốn trả lời, muốn thôi hỏi (\"đừng hỏi nữa\")"),
      still_afraid: z
        .boolean()
        .describe("Học sinh nói đã hiểu / đã biết là không sao NHƯNG vẫn sợ, vẫn không dám. Lần đầu kể là mình sợ, không dám thì là false"),
      chose_option: z.boolean().describe("Học sinh vừa chọn một cách trợ lý đã đưa ra"),
      rejected_option: z.string().describe("Cách làm học sinh nói không muốn làm, ngắn; rỗng nếu không"),
      tried: z
        .enum(["none", "worked", "not_worked"])
        .describe(
          "Học sinh kể đã thử hoặc đã chuẩn bị làm một việc để ứng phó: worked = làm được / có ích; not_worked = chưa làm được, chưa đỡ (kể cả \"chuẩn bị rồi nhưng vẫn không dám\"); none = không kể",
        ),
      wants_adult: z.boolean().describe("Học sinh muốn nhờ thầy cô / người lớn, muốn người lớn biết chuyện"),
      topic_shift: z
        .boolean()
        .describe(
          "Học sinh kể sang một chuyện / một nguồn lo KHÁC với chuyện đang nói (ví dụ đang nói chuyện phát biểu thì kể chuyện ở nhà, bố mẹ, bạn bè); thường mở đầu bằng \"thật ra\", \"còn\", \"ngoài ra\"",
        ),
    })
    .describe("Nhận diện lượt cho bộ điều phối SEL. Không ảnh hưởng mức an toàn."),
});

async function classifierCheck(message: string, history: Turn[]): Promise<SafetyResult> {
  const context = history
    .slice(-6)
    .map((t) => `${t.role === "user" ? "Học sinh" : "Trợ lý"}: ${t.content}`)
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
  const { note, sel, ...signals } = parsed;
  const { level, reasons } = levelFromSignals(signals);
  return {
    level,
    reasons: level === "none" ? [] : [...reasons.map((r) => `AI: ${r}`), ...(note.trim() ? [`AI ghi: ${note.trim()}`] : [])],
    stress: signals.stress,
    signals,
    sel,
  };
}
