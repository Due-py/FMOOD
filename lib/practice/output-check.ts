// KIỂM TRA CHỮ TRỢ LÝ VIẾT TRONG BÀI LUYỆN trước khi hiện (hàm thuần, chạy được ở test, không gọi AI).
// Dùng cho lib/ai/practice-feedback.ts. Câu không qua kiểm tra thì không hiện: góp ý thay bằng tiêu chí cố định,
// các phần khác dùng nội dung soạn sẵn.
import { keywordCheck } from "@/lib/safety/keywords";
import { guardReply, lamHo } from "@/lib/safety/reply-guard";
import { SKILLS, type SkillId } from "@/lib/skills";
import { fold } from "@/lib/safety/normalize";
import type { PracticeFeedback } from "./shared";
import type { Answers } from "./state";

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

/** Tập nói (mở lời nhờ người giúp): câu của "thầy cô" trong vai không được là lời nhờ viết lại thay học sinh (giọng học sinh, lời khuyên sửa câu). */
export function rewritesRequest(text: string): boolean {
  return /(thưa|em chào|kính gửi)\s+(thầy|cô)|(^|\s)ạ[.!?]|được không ạ|(bạn|em) (nên|có thể) (viết|nói|sửa)( lại)? (là|thành)/iu.test(text);
}

/**
 * Tập nói với BẠN CÙNG LỚP (nghe bạn, giải quyết bất đồng, nói "không"): câu của "bạn" trong vai có hiện được không.
 * Không làm hộ và không ra khỏi vai, nên KHÔNG được:
 *  - viết sẵn / sửa câu cho học sinh, nhận xét hay chấm cách nói ("bạn nên nói là…", "câu nhắc lại của bạn hay đấy");
 *  - là lời nhờ giọng học sinh gửi thầy cô (rewritesRequest, như vai thầy cô);
 *  - gọi "em" (vai bạn xưng "mình – bạn"), hay nhận là trợ lý / AI;
 *  - chạm bộ lọc từ khóa an toàn (vai bạn không bao giờ nhắc chuyện nguy hiểm, kể cả khi học sinh gợi ra).
 * Trả lý do (để ghi log, test) hoặc null khi câu dùng được.
 */
export function partnerLineProblem(text: string): "sua-cau" | "loi-nho" | "xung-em" | "ra-vai" | "an-toan" | null {
  if (keywordCheck(text).level !== "none") return "an-toan";
  if (
    /(bạn|cậu)\s+(nên|có thể|thử|hãy)\s+(nói|hỏi|viết|trả lời|nhắc lại|sửa)(\s+lại)?\s*(là|thành|rằng|kiểu|như sau|:)/iu.test(text) ||
    /(câu|lời)\s+((nhắc lại|từ chối|hỏi han|mở lời|hỏi)\s+)?(của bạn|bạn vừa nói)\s+(rất\s+|khá\s+|chưa\s+)?(hay|tốt|ổn|chuẩn|rõ)(?!\p{L})/iu.test(text) ||
    /(câu|lời)\s+(nhắc lại|từ chối|hỏi han|mở lời)\s+(rất\s+|khá\s+|chưa\s+)?(hay|tốt|ổn|chuẩn|rõ)(?!\p{L})/iu.test(text) ||
    /bạn\s+(nói|hỏi|nhắc lại|từ chối|lắng nghe)\s+(rất\s+|khá\s+|thế là\s+|vậy là\s+)?(hay|tốt|giỏi|chuẩn)([^\p{L}]|$)/iu.test(text)
  ) {
    return "sua-cau";
  }
  if (rewritesRequest(text)) return "loi-nho";
  if (/(^|[^\p{L}])em(?!\p{L})(?!\s+(trai|gái|út|bé|họ)(?!\p{L}))/iu.test(text)) return "xung-em";
  if (/(trợ lý|chatbot|người máy|trí tuệ nhân tạo)/iu.test(text) || /(^|[^\p{L}])AI(?!\p{L})/u.test(text)) return "ra-vai";
  return null;
}

/** Danh sách tiêu chí cố định của mô-đun: dùng khi AI lỗi, quá giờ, hoặc góp ý không qua kiểm tra. */
export function criteriaFeedback(skill: SkillId): PracticeFeedback {
  return { kind: "criteria", criteria: [...SKILLS[skill].criteria] };
}

const oneLine = (t: string) => t.replace(/\s+/g, " ").trim();

/** Câu có nhắc một trong các chữ (nguyên chữ, có dấu, không phân biệt hoa thường): "cô" không khớp "có". */
function mentionsAny(text: string, words: string[]): boolean {
  const t = text.toLowerCase().normalize("NFC");
  return words.some((w) => new RegExp(`(^|[^\\p{L}])${w.toLowerCase().normalize("NFC")}(?!\\p{L})`, "u").test(t));
}

/** Ô ưu tiên của mô-đun (SKILLS[k].feedbackPriority) chưa đạt: trống, hoặc có cụm như "không cần", "giữ bí mật". */
export function priorityUnmet(skill: SkillId, answers: Answers): boolean {
  const p = SKILLS[skill].feedbackPriority;
  if (!p) return false;
  const v = (answers[p.field] ?? "").trim();
  if (v.length < 2) return true;
  const t = ` ${fold(v)} `;
  return p.unmetIf.some((w) => t.includes(w));
}

/**
 * Góp ý AI trả về → góp ý được hiện. Đúng 3 ý, mỗi ý ngắn, câu hỏi kết thúc bằng "?",
 * qua guardReply, không làm hộ, không viết lại bài; không đạt thì trả tiêu chí cố định.
 */
export function acceptFeedback(
  skill: SkillId,
  raw: { good: string; fix: string; question: string } | null,
  student: string,
  /** bài làm (để kiểm tra ô ưu tiên của mô-đun, nếu có) */
  answers?: Answers,
): PracticeFeedback {
  if (!raw) return criteriaFeedback(skill);
  const items = [oneLine(raw.good), oneLine(raw.fix), oneLine(raw.question)];
  const ok =
    items.every((t) => t.length >= 4 && t.length <= 260 && safeOut(t, student, true) && !rewritesStudent(t, student)) && items[2].includes("?");
  if (!ok) return criteriaFeedback(skill);
  // ô ưu tiên còn trống (ví dụ chưa nói lúc nào nhờ người lớn) mà ý "fix" nói chuyện khác: không hiện, dùng tiêu chí cố định
  const priority = SKILLS[skill].feedbackPriority;
  if (priority && answers && priorityUnmet(skill, answers) && !mentionsAny(items[1], priority.mustMention)) {
    return criteriaFeedback(skill);
  }
  return { kind: "ai", good: items[0], fix: items[1], question: items[2] };
}
