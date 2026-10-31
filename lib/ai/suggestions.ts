import "server-only";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { openai, safetyModel } from "@/lib/ai/openai";
import { timed } from "@/lib/ai/log";

// GỢI Ý TRẢ LỜI NHANH: 2–3 câu ngắn học sinh có thể bấm để trả lời trợ lý,
// giúp những bạn "không biết bắt đầu nói thế nào".

const Suggestions = z.object({ suggestions: z.array(z.string()) });

const INSTRUCTIONS = `Bạn tạo gợi ý trả lời nhanh cho một học sinh 12–17 tuổi đang trò chuyện với trợ lý AI đồng hành của F-Mood.
Dựa vào câu trợ lý vừa nói, viết 3 câu trả lời ngắn mà HỌC SINH có thể bấm để gửi:
- Viết ở ngôi của học sinh, xưng "mình", tiếng Việt tự nhiên như học sinh nhắn tin.
- Mỗi câu tối đa 8 từ, không dùng emoji, không có dấu ngoặc kép.
- Ba câu nên khác hướng nhau (ví dụ: trả lời cụ thể / chưa chắc / muốn chuyển sang chuyện khác).
- Nếu trợ lý hỏi lựa chọn, gợi ý vài lựa chọn đó.
- Tuyệt đối không gợi ý nội dung tự làm hại, bạo lực hay tiêu cực nặng nề.`;

export async function generateSuggestions(lastUser: string, reply: string): Promise<string[]> {
  try {
    const model = await safetyModel();
    const res = await timed(
      "suggestions",
      model,
      () =>
        openai().responses.parse({
          model,
          instructions: INSTRUCTIONS,
          input: `Học sinh: ${lastUser.slice(0, 500)}\nTrợ lý: ${reply.slice(0, 1200)}`,
          text: { format: zodTextFormat(Suggestions, "suggestions") },
          reasoning: { effort: "low" },
          store: false,
        }),
      (r) => ({ input: r.usage?.input_tokens, output: r.usage?.output_tokens }),
    );
    return (res.output_parsed?.suggestions ?? [])
      .map((s) => s.trim().replace(/^["“]|["”]$/g, ""))
      .filter((s) => s.length >= 2 && s.length <= 60)
      .slice(0, 3);
  } catch (error) {
    console.error("[F-Mood] Tạo gợi ý trả lời lỗi", error);
    return [];
  }
}
