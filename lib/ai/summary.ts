import "server-only";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { openai, safetyModel } from "@/lib/ai/openai";
import { timed } from "@/lib/ai/log";
import { cleanSummary } from "@/lib/chat-loop";
import { guardReply } from "@/lib/safety/reply-guard";
import { DIFFICULTY_MAX } from "@/lib/worries-shared";

// TÓM TẮT KHÓ KHĂN (QT03, QT05): sau khi trợ lý trả lời xong, viết MỘT câu tóm tắt điều đang làm bạn ấy khó
// để học sinh bấm "Đúng rồi" hoặc sửa. Chạy SAU câu trả lời (không làm trợ lý chậm), giống gợi ý trả lời nhanh.
// Câu chỉ thành "khó khăn đã xác nhận" khi học sinh tự bấm "Đúng rồi".

const Summary = z.object({ summary: z.string() });

const INSTRUCTIONS = `Bạn đọc đoạn trò chuyện giữa một học sinh 12–17 tuổi và trợ lý AI đồng hành của F-Mood.
Viết MỘT câu tóm tắt điều đang làm học sinh khó khăn, để hỏi lại học sinh "mình hiểu vậy đúng chưa?".
- Bắt đầu bằng "bạn" (ví dụ: "bạn đã học rồi nhưng sợ vào phòng thi sẽ quên công thức").
- Dựa vào tin nhắn MỚI NHẤT của học sinh trước: nếu học sinh vừa sửa lại ý ("không phải", "thực ra", "hiểu chưa đúng"), chỉ theo ý mới, bỏ ý cũ.
- Chỉ nói điều học sinh đã kể, không thêm nguyên nhân, không đoán, không chẩn đoán, không khuyên.
- Tối đa 25 từ, không dùng dấu ngoặc kép, không emoji, KHÔNG thêm câu hỏi ở cuối (chỉ viết phần tóm tắt).
- Nếu học sinh chưa kể khó khăn nào cụ thể, trả về chuỗi rỗng.`;

export async function summarizeDifficulty(turns: { role: "user" | "assistant"; content: string }[]): Promise<string | null> {
  try {
    const model = await safetyModel();
    const input = turns
      .slice(-6)
      .map((t) => `${t.role === "user" ? "Học sinh" : "Trợ lý"}: ${t.content.slice(0, 600)}`)
      .join("\n");
    // ghi nhật ký chung loại "suggestions" (việc chạy sau câu trả lời), không cần sửa bảng ai_logs
    const res = await timed(
      "suggestions",
      model,
      () =>
        openai().responses.parse({
          model,
          instructions: INSTRUCTIONS,
          input,
          text: { format: zodTextFormat(Summary, "summary") },
          reasoning: { effort: "low" },
          store: false,
        }),
      (r) => ({ input: r.usage?.input_tokens, output: r.usage?.output_tokens }),
    );
    const text = cleanSummary(res.output_parsed?.summary ?? "");
    if (text.length < 8 || text.length > DIFFICULTY_MAX) return null;
    // câu sẽ hiện cho học sinh: qua cùng bộ kiểm tra câu trả lời của trợ lý
    return guardReply(text).ok ? text : null;
  } catch (error) {
    console.error("[F-Mood] Tóm tắt khó khăn lỗi", error);
    return null;
  }
}
