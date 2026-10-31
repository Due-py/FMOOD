import { z } from "zod";

// PHIẾU KHẢO SÁT: cấu trúc câu hỏi (dùng chung cho server và trình duyệt)
// Bài đo kỹ năng (kind "test", kế hoạch Demo 3 mục 6.2) dùng lại đúng cấu trúc này.

export const questionSchema = z.object({
  id: z.string().min(1).max(20),
  type: z.enum(["scale", "choice", "text"]),
  // bài đo cần cả đoạn tả tình huống trong câu hỏi nên cho tới 1500 ký tự
  text: z.string().trim().min(1, "Câu hỏi chưa có nội dung").max(1500),
  required: z.boolean().default(true),
  /** lựa chọn (cho câu "choice") */
  options: z.array(z.string().trim().min(1).max(120)).max(10).default([]),
  /** nhãn hai đầu thang điểm (cho câu "scale" 1–5) */
  minLabel: z.string().max(40).default(""),
  maxLabel: z.string().max(40).default(""),
  /** chỉ hỏi khi câu `id` được trả lời bằng một trong các lựa chọn `in` (ví dụ HV2 chỉ hỏi khi HV1 từ 1 lần trở lên) */
  showIf: z.object({ id: z.string().min(1).max(20), in: z.array(z.string().max(120)).min(1).max(10) }).optional(),
});

export type SurveyQuestion = z.infer<typeof questionSchema>;

/** survey = phiếu khảo sát thường · test = bài đo kỹ năng (bài tình huống, chấm mù) */
export type SurveyKind = "survey" | "test";

export type Survey = {
  id: string;
  title: string;
  description: string;
  questions: SurveyQuestion[];
  class_ids: string[] | null;
  status: "draft" | "open" | "closed";
  created_at: string;
  /** không có khi chưa chạy migration 0018: coi là phiếu thường */
  kind?: SurveyKind;
  test_round?: 1 | 2 | null;
  test_form?: "A" | "B" | null;
};

export type SurveyAnswers = Record<string, string | number>;

export const QUESTION_TYPE_LABEL: Record<SurveyQuestion["type"], string> = {
  scale: "Thang điểm 1–5",
  choice: "Chọn một đáp án",
  text: "Tự trả lời",
};

/** Độ dài tối đa của một câu tự trả lời: phiếu thường 1000, bài đo 1500 ký tự. */
export function maxAnswerLength(kind: SurveyKind = "survey"): number {
  return kind === "test" ? 1500 : 1000;
}

/** Câu này có đang được hỏi không (theo điều kiện `showIf` và câu trả lời hiện tại). */
export function isQuestionShown(q: SurveyQuestion, answers: SurveyAnswers): boolean {
  if (!q.showIf) return true;
  const a = answers[q.showIf.id];
  return a !== undefined && q.showIf.in.includes(String(a));
}

/** Kiểm tra câu trả lời của học sinh theo đúng cấu trúc phiếu. */
export function validateAnswers(questions: SurveyQuestion[], answers: SurveyAnswers, kind: SurveyKind = "survey"): string | null {
  const max = maxAnswerLength(kind);
  for (const q of questions) {
    if (!isQuestionShown(q, answers)) continue;
    const a = answers[q.id];
    const empty = a === undefined || a === null || a === "";
    if (empty) {
      if (q.required) return `Bạn chưa trả lời: "${shortQuestion(q.text)}"`;
      continue;
    }
    if (q.type === "scale" && !(Number.isInteger(a) && Number(a) >= 1 && Number(a) <= 5)) return "Câu trả lời chưa hợp lệ.";
    if (q.type === "choice" && !q.options.includes(String(a))) return "Câu trả lời chưa hợp lệ.";
    if (q.type === "text" && String(a).length > max) return `Câu trả lời quá dài (tối đa ${max} ký tự).`;
  }
  return null;
}

/** Phần câu hỏi (đoạn cuối) của một câu có kèm đoạn tả tình huống phía trên. */
export function shortQuestion(text: string): string {
  const parts = text.split(/\n\s*\n/);
  return parts[parts.length - 1].trim();
}
