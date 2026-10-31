// KIỂM TRA CHỮ TRỢ LÝ VIẾT TRONG BÀI LUYỆN trước khi hiện (hàm thuần, chạy được ở test, không gọi AI).
// Dùng cho lib/ai/practice-feedback.ts. Câu không qua kiểm tra thì không hiện: góp ý thay bằng tiêu chí cố định,
// các phần khác dùng nội dung soạn sẵn.
import { guardReply, lamHo } from "@/lib/safety/reply-guard";
import { SKILLS, type SkillCode } from "@/lib/skills";
import type { PracticeFeedback } from "./shared";

/**
 * Câu AI viết có được hiện không: qua guardReply, và không phải bản làm hộ việc của chính học sinh.
 * `strict`: coi như học sinh đã đòi làm hộ (bài trong ô luyện là việc của chính bạn ấy), nên câu không được
 * chứa lời nhắn hoàn chỉnh gửi thầy cô, bảng giờ đã điền, bài viết xong hay lời giải.
 */
export function safeOut(text: string, student: string, strict: boolean): boolean {
  if (!guardReply(text, student).ok) return false;
  return !(strict && lamHo(`làm hộ lời nhờ ${student}`, text));
}

/** Đoạn trích trong ngoặc dài (≥ 12 từ) mà học sinh chưa từng viết: là viết lại bài thay học sinh. */
export function rewritesStudent(text: string, student: string): boolean {
  const norm = (t: string) => t.toLowerCase().replace(/\s+/g, " ").trim();
  for (const m of text.matchAll(/[“"«]([^”"»]+)[”"»]/gu)) {
    const quote = m[1];
    if (quote.trim().split(/\s+/).length >= 12 && !norm(student).includes(norm(quote))) return true;
  }
  return false;
}

/** K4 tập nói: câu của "thầy cô" trong vai không được là lời nhờ viết lại thay học sinh (giọng học sinh, lời khuyên sửa câu). */
export function rewritesRequest(text: string): boolean {
  return /(thưa|em chào|kính gửi)\s+(thầy|cô)|(^|\s)ạ[.!?]|được không ạ|(bạn|em) (nên|có thể) (viết|nói|sửa)( lại)? (là|thành)/iu.test(text);
}

/** Danh sách tiêu chí cố định của mô-đun: dùng khi AI lỗi, quá giờ, hoặc góp ý không qua kiểm tra. */
export function criteriaFeedback(skill: SkillCode): PracticeFeedback {
  return { kind: "criteria", criteria: [...SKILLS[skill].criteria] };
}

const oneLine = (t: string) => t.replace(/\s+/g, " ").trim();

/**
 * Góp ý AI trả về → góp ý được hiện. Đúng 3 ý, mỗi ý ngắn, câu hỏi kết thúc bằng "?",
 * qua guardReply, không làm hộ, không viết lại bài; không đạt thì trả tiêu chí cố định.
 */
export function acceptFeedback(skill: SkillCode, raw: { good: string; fix: string; question: string } | null, student: string): PracticeFeedback {
  if (!raw) return criteriaFeedback(skill);
  const items = [oneLine(raw.good), oneLine(raw.fix), oneLine(raw.question)];
  const ok =
    items.every((t) => t.length >= 4 && t.length <= 260 && safeOut(t, student, true) && !rewritesStudent(t, student)) && items[2].includes("?");
  if (!ok) return criteriaFeedback(skill);
  return { kind: "ai", good: items[0], fix: items[1], question: items[2] };
}
