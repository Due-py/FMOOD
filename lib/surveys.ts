import { z } from "zod";

// PHIẾU KHẢO SÁT: cấu trúc câu hỏi (dùng chung cho server và trình duyệt)

export const questionSchema = z.object({
  id: z.string().min(1).max(20),
  type: z.enum(["scale", "choice", "text"]),
  text: z.string().trim().min(1, "Câu hỏi chưa có nội dung").max(300),
  required: z.boolean().default(true),
  /** lựa chọn (cho câu "choice") */
  options: z.array(z.string().trim().min(1).max(120)).max(10).default([]),
  /** nhãn hai đầu thang điểm (cho câu "scale" 1–5) */
  minLabel: z.string().max(40).default(""),
  maxLabel: z.string().max(40).default(""),
});

export type SurveyQuestion = z.infer<typeof questionSchema>;

export type Survey = {
  id: string;
  title: string;
  description: string;
  questions: SurveyQuestion[];
  class_ids: string[] | null;
  status: "draft" | "open" | "closed";
  created_at: string;
};

export type SurveyAnswers = Record<string, string | number>;

export const QUESTION_TYPE_LABEL: Record<SurveyQuestion["type"], string> = {
  scale: "Thang điểm 1–5",
  choice: "Chọn một đáp án",
  text: "Tự trả lời",
};

/** Kiểm tra câu trả lời của học sinh theo đúng cấu trúc phiếu. */
export function validateAnswers(questions: SurveyQuestion[], answers: SurveyAnswers): string | null {
  for (const q of questions) {
    const a = answers[q.id];
    const empty = a === undefined || a === null || a === "";
    if (empty) {
      if (q.required) return `Bạn chưa trả lời: "${q.text}"`;
      continue;
    }
    if (q.type === "scale" && !(Number.isInteger(a) && Number(a) >= 1 && Number(a) <= 5)) return "Câu trả lời chưa hợp lệ.";
    if (q.type === "choice" && !q.options.includes(String(a))) return "Câu trả lời chưa hợp lệ.";
    if (q.type === "text" && String(a).length > 1000) return "Câu trả lời quá dài (tối đa 1000 ký tự).";
  }
  return null;
}
