// Phần dùng chung của trang Luyện kỹ năng (máy chủ và trình duyệt, không đọc cơ sở dữ liệu).
import { subskillBySlug } from "@/lib/sel/casel";
import { readSubskill } from "@/lib/sel/legacy";
import { isSkillId, skillOfAction, type SkillId } from "@/lib/skills";
import type { RoleplayTurn } from "./roleplay";
import type { PracticeState, PracticeStep } from "./state";

/** Kỹ năng của một việc nhỏ: trường `skill` nếu cô Thúy đã gắn (mã mới hoặc mã cũ), không thì theo mã HD (dữ liệu cũ). */
export function actionSkill(data: Record<string, unknown>): SkillId | null {
  const s = readSubskill(data.skill);
  if (isSkillId(s)) return s;
  return skillOfAction(typeof data.code === "string" ? data.code : null);
}

/** Một giá trị đã lưu / được gửi lên (id mới, mã cũ) → mô-đun luyện; không nhận ra hoặc chưa có mô-đun → null. */
export function toSkillId(v: unknown): SkillId | null {
  const s = readSubskill(v);
  return isSkillId(s) ? s : null;
}

/** Kỹ năng của một dòng practice_sessions: cột subskill (từ 0026), không có thì cột skill cũ. Không nhận ra → null (bỏ qua, không đoán). */
export function skillOfRow(r: { subskill?: unknown; skill?: unknown }): SkillId | null {
  return toSkillId(r.subskill ?? r.skill);
}

/**
 * Đoạn đường dẫn /luyen/<…> → mô-đun luyện: slug kỹ năng thành phần ("go-roi-tung-buoc"), id, hoặc đường dẫn cũ
 * ("k3", đánh dấu trang từ trước 01/11).
 */
export function skillFromSlug(slug: string): SkillId | null {
  const bySlug = subskillBySlug(slug.toLowerCase());
  if (bySlug) return isSkillId(bySlug.id) ? bySlug.id : null;
  return toSkillId(slug) ?? toSkillId(slug.toUpperCase());
}

/** Độ dài tối đa: tình huống riêng, một ô bài làm, việc sẽ thử, một lượt tập nói. */
export const LIMITS = { situation: 300, field: 600, nextTry: 200, roleplay: 400 } as const;

/** Góp ý của trợ lý: đúng 3 ý; khi AI lỗi thì là danh sách tiêu chí cố định của mô-đun. */
export type PracticeFeedback =
  | { kind: "ai"; good: string; fix: string; question: string }
  | { kind: "criteria"; criteria: string[] };

/** Một lượt tập nói: học sinh nói, trợ lý đáp trong vai thầy cô ("teacher") hoặc bạn cùng lớp ("partner"). Xem roleplay.ts. */
export type { RoleplayTurn } from "./roleplay";

/** Một lần lưu bài (lần 1 hoặc lần 2) như học sinh thấy. */
export type AttemptView = { version: 1 | 2; answers: Record<string, string>; feedback: PracticeFeedback | null; roleplay: RoleplayTurn[] };

/** Bài luyện gửi xuống trình duyệt (chỉ của chính học sinh đó). */
export type PracticeView = {
  id: string;
  skill: SkillId;
  caseCode: string | null;
  /** tình huống mẫu hoặc lời học sinh tự kể */
  situation: string | null;
  own: boolean;
  step: PracticeStep;
  state: PracticeState;
  hintCount: number;
  feedbackCount: number;
  /** số lượt tập nói còn lại và còn được hỏi ví dụ khác không */
  roleplayLeft: number;
  /** vai đã dừng (thoát vai vì an toàn hoặc học sinh không muốn tập nữa): không tập nói tiếp trong bài này */
  roleplayStopped: boolean;
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
