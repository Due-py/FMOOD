import "server-only";
import type { FunctionTool } from "openai/resources/responses/responses";
import { z } from "zod";
import type { ChatAttachment } from "@/lib/chat-events";
import { pickExercise } from "@/lib/ai/exercise-pick";
import { addConcern, addMemory, updateConcernFromChat } from "@/lib/may-memory";
import { askedPermission, MEMORY_KINDS } from "@/lib/may-memory-shared";

// CÔNG CỤ CỦA MÂY (function calling). Cách dùng được dặn trong BUILTIN_SKILLS.

export const MAY_TOOLS: FunctionTool[] = [
  {
    type: "function",
    name: "ghi_nho",
    description:
      "Ghi nhớ lâu dài một điều về học sinh để dùng ở các cuộc trò chuyện sau: cách xưng hô, sở thích / điều quan tâm, hoặc kiểu trả lời bạn ấy thích.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        loai: { type: "string", enum: MEMORY_KINDS, description: "address = cách xưng hô, interest = sở thích, style = kiểu trả lời bạn ấy thích, other = khác" },
        noi_dung: { type: "string", description: "Ghi chú ngắn, không có chủ ngữ, tối đa 120 ký tự. Ví dụ: gọi là Duy / thích bóng đá" },
      },
      required: ["loai", "noi_dung"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "luu_dieu_ban_long",
    description: "Lưu một điều bận lòng vào danh sách để vài hôm sau hỏi thăm lại. CHỈ dùng khi học sinh đã đồng ý lưu và đã cho điểm 1–10.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        tieu_de: { type: "string", description: "Tóm tắt ngắn chuyện bận lòng, tối đa 80 ký tự, không chứa họ tên người khác" },
        muc_do: { type: "integer", description: "Mức bận lòng học sinh tự chấm, 1–10" },
      },
      required: ["tieu_de", "muc_do"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "cap_nhat_dieu_ban_long",
    description: "Cập nhật một điều bận lòng đã lưu sau khi học sinh trả lời lời hỏi thăm.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "id trong danh sách điều bận lòng" },
        muc_do: { type: ["integer", "null"], description: "Mức mới 1–10 nếu học sinh có nói, không thì null" },
        trang_thai: { type: ["string", "null"], enum: ["open", "better", "resolved", null], description: "better = đỡ hơn, resolved = đã ổn hẳn, null = không đổi" },
      },
      required: ["id", "muc_do", "trang_thai"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "goi_y_bai_tap",
    description: "Tìm MỘT bài tập phù hợp trong thư viện bài học F-Mood để gợi ý cho học sinh làm hôm nay.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        chu_de: { type: "string", description: "Chủ đề / nhu cầu, ví dụ: bớt lo lắng trước kỳ thi, làm quen bạn mới, biết ơn" },
      },
      required: ["chu_de"],
      additionalProperties: false,
    },
  },
];

const memoryArgs = z.object({ loai: z.enum(MEMORY_KINDS), noi_dung: z.string().trim().min(1).max(200) });
const concernArgs = z.object({ tieu_de: z.string().trim().min(1).max(120), muc_do: z.number().int().min(1).max(10) });
const updateArgs = z.object({
  id: z.uuid(),
  muc_do: z.number().int().min(1).max(10).nullable(),
  trang_thai: z.enum(["open", "better", "resolved"]).nullable(),
});
const exerciseArgs = z.object({ chu_de: z.string().trim().min(1).max(200) });

export type ToolContext = { userId: string; lastAssistant?: string };
export type ToolResult = { output: unknown; attachment?: ChatAttachment };

export async function runMayTool(name: string, rawArgs: string, ctx: ToolContext): Promise<ToolResult> {
  let args: unknown;
  try {
    args = JSON.parse(rawArgs);
  } catch {
    return { output: { loi: "Tham số không hợp lệ." } };
  }

  switch (name) {
    case "ghi_nho": {
      const p = memoryArgs.safeParse(args);
      if (!p.success) return { output: { loi: "Tham số không hợp lệ." } };
      const m = await addMemory(ctx.userId, p.data.loai, p.data.noi_dung);
      if (!m) return { output: { loi: "Chưa ghi nhớ được." } };
      return { output: { ok: true }, attachment: { type: "memory", id: m.id, content: m.content } };
    }
    case "luu_dieu_ban_long": {
      const p = concernArgs.safeParse(args);
      if (!p.success) return { output: { loi: "Tham số không hợp lệ (mức độ phải từ 1 đến 10)." } };
      if (!askedPermission(ctx.lastAssistant)) {
        return { output: { loi: "Chưa lưu: hãy hỏi xin phép bạn ấy trước, chỉ lưu khi bạn ấy đồng ý." } };
      }
      const c = await addConcern(ctx.userId, p.data.tieu_de, p.data.muc_do);
      if (!c) return { output: { loi: "Chưa lưu được." } };
      return {
        output: { ok: true, hoi_tham_lai_sau: "3 ngày" },
        attachment: { type: "concern", id: c.id, title: c.title, intensity: c.intensity, action: "saved", status: c.status },
      };
    }
    case "cap_nhat_dieu_ban_long": {
      const p = updateArgs.safeParse(args);
      if (!p.success) return { output: { loi: "Tham số không hợp lệ." } };
      const c = await updateConcernFromChat(ctx.userId, p.data.id, { intensity: p.data.muc_do, status: p.data.trang_thai });
      if (!c) return { output: { loi: "Không tìm thấy điều bận lòng này." } };
      return {
        output: { ok: true },
        attachment: { type: "concern", id: c.id, title: c.title, intensity: c.intensity, action: "updated", status: c.status },
      };
    }
    case "goi_y_bai_tap": {
      const p = exerciseArgs.safeParse(args);
      if (!p.success) return { output: { loi: "Tham số không hợp lệ." } };
      const ex = await pickExercise(ctx.userId, p.data.chu_de);
      if (!ex) return { output: { loi: "Thư viện chưa có bài tập nào." } };
      return {
        output: { bai_hoc: ex.lessonTitle, tom_tat: ex.summary, bai_tap: ex.prompt },
        attachment: { type: "exercise", ...ex },
      };
    }
    default:
      return { output: { loi: "Không có công cụ này." } };
  }
}
