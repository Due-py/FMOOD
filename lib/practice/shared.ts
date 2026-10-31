// Phần dùng chung của trang Luyện kỹ năng (máy chủ và trình duyệt, không đọc cơ sở dữ liệu).
import { isSkillCode, skillOfAction, type SkillCode } from "@/lib/skills";
import type { PracticeState, PracticeStep } from "./state";

/** Kỹ năng của một việc nhỏ: trường `skill` nếu cô Thúy đã gắn, không thì theo mã HD (dữ liệu cũ). */
export function actionSkill(data: Record<string, unknown>): SkillCode | null {
  if (isSkillCode(data.skill)) return data.skill;
  return skillOfAction(typeof data.code === "string" ? data.code : null);
}

/** Đường dẫn trang chọn tình huống của một kỹ năng: /luyen/k3. */
export const skillHref = (skill: SkillCode) => `/luyen/${skill.toLowerCase()}`;

/** "k3" / "K3" trong đường dẫn → "K3". */
export function skillFromSlug(slug: string): SkillCode | null {
  const code = slug.toUpperCase();
  return isSkillCode(code) ? code : null;
}

/** Độ dài tối đa: tình huống riêng, một ô bài làm, việc sẽ thử, một lượt tập nói. */
export const LIMITS = { situation: 300, field: 600, nextTry: 200, roleplay: 400 } as const;

/** Góp ý của trợ lý: đúng 3 ý; khi AI lỗi thì là danh sách tiêu chí cố định của mô-đun. */
export type PracticeFeedback =
  | { kind: "ai"; good: string; fix: string; question: string }
  | { kind: "criteria"; criteria: string[] };

/** Một lượt tập nói (K4): học sinh nói, trợ lý đóng vai thầy cô đáp. */
export type RoleplayTurn = { role: "student" | "teacher"; text: string };

/** Một lần lưu bài (lần 1 hoặc lần 2) như học sinh thấy. */
export type AttemptView = { version: 1 | 2; answers: Record<string, string>; feedback: PracticeFeedback | null; roleplay: RoleplayTurn[] };

/** Bài luyện gửi xuống trình duyệt (chỉ của chính học sinh đó). */
export type PracticeView = {
  id: string;
  skill: SkillCode;
  caseCode: string | null;
  /** tình huống mẫu hoặc lời học sinh tự kể */
  situation: string | null;
  own: boolean;
  step: PracticeStep;
  state: PracticeState;
  hintCount: number;
  feedbackCount: number;
  /** số lượt tập nói còn lại (K4) và còn được hỏi ví dụ khác không */
  roleplayLeft: number;
  exampleLeft: boolean;
  bridge: string | null;
  nextTry: string | null;
  attempts: AttemptView[];
};

/** Kết quả chung của các nút trong bài luyện. `crisis`: bộ an toàn xếp khẩn cấp, bài đã dừng. */
export type PracticeResult<T = object> =
  | ({ ok: true; view: PracticeView } & T)
  | { ok: false; error: string; view?: PracticeView }
  | { ok: false; crisis: { text: string; notified: boolean } };
