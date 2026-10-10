import { z } from "zod";

// BÀI TẬP TRONG BÀI HỌC (dùng chung cho server và trình duyệt)

export const exerciseSchema = z.object({
  id: z.string().regex(/^e\d{1,2}$/),
  type: z.enum(["text", "choice", "multi", "scale"]),
  prompt: z.string().trim().min(3).max(400),
  options: z.array(z.string().trim().min(1).max(200)).max(8).default([]),
  minLabel: z.string().max(40).default(""),
  maxLabel: z.string().max(40).default(""),
  hint: z.string().trim().max(400).default(""),
  /** đáp án đúng (chỉ câu kiểm tra kiến thức): một lựa chọn, hoặc danh sách với "multi" */
  answer: z.union([z.string(), z.array(z.string())]).optional(),
});

export type Exercise = z.infer<typeof exerciseSchema>;

export const EXERCISE_TYPE_LABEL: Record<Exercise["type"], string> = {
  text: "Tự viết",
  choice: "Chọn một",
  multi: "Chọn nhiều",
  scale: "Thang 1–5",
};

export type ExerciseAnswer = string | string[] | number;

/** Kiểm tra câu trả lời có đúng dạng với bài tập không. Trả về thông báo lỗi hoặc null. */
export function validateExerciseAnswer(ex: Exercise, answer: unknown): string | null {
  switch (ex.type) {
    case "text":
      if (typeof answer !== "string" || !answer.trim()) return "Viết vài chữ thôi cũng được nhé.";
      if (answer.length > 1500) return "Tối đa 1500 ký tự.";
      return null;
    case "choice":
      return typeof answer === "string" && ex.options.includes(answer) ? null : "Chọn một đáp án nhé.";
    case "multi":
      return Array.isArray(answer) && answer.length > 0 && answer.every((a) => ex.options.includes(a))
        ? null
        : "Chọn ít nhất một đáp án nhé.";
    case "scale":
      return Number.isInteger(answer) && Number(answer) >= 1 && Number(answer) <= 5 ? null : "Chọn một mức từ 1 đến 5.";
  }
}

/** Câu kiểm tra kiến thức: đúng / sai / không chấm (câu hỏi ý kiến). */
export function gradeAnswer(ex: Exercise, answer: ExerciseAnswer): boolean | null {
  if (ex.answer === undefined) return null;
  if (ex.type === "choice") return answer === ex.answer;
  if (ex.type === "multi" && Array.isArray(ex.answer) && Array.isArray(answer)) {
    const want = new Set(ex.answer);
    return answer.length === want.size && answer.every((a) => want.has(a));
  }
  return null;
}

/** Hiển thị câu trả lời dạng chữ (dùng cho cảnh báo / nhờ thầy cô). */
export function answerText(answer: ExerciseAnswer): string {
  return Array.isArray(answer) ? answer.join("; ") : String(answer);
}

/**
 * Xáo thứ tự lựa chọn một cách CỐ ĐỊNH theo khóa (không dùng ngẫu nhiên), để đáp án đúng
 * không luôn nằm đầu tiên mà server và trình duyệt vẫn hiển thị giống nhau.
 */
export function stableShuffle<T>(items: T[], key: string): T[] {
  let seed = 0;
  for (const ch of key) seed = (Math.imul(seed, 31) + ch.charCodeAt(0)) >>> 0;
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    const j = seed % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
