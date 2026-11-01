// DỮ LIỆU ĐÃ LƯU ↔ TRẠNG THÁI BÀI LUYỆN (hàm thuần, chạy được ở test; lib/practice/server.ts dùng lại).
// - Khôi phục bài sau khi tải lại trang / tạm dừng: trạng thái chỉ dựng lại từ các cột đã lưu và bài làm đã lưu,
//   không dựa vào gì trên trình duyệt.
// - Mở bài: học sinh KHÔNG bắt buộc kể chuyện riêng; không muốn chia sẻ thì chọn một tình huống luyện mẫu (TL01–TL12).
import { isSubskillId, subskillBySlug } from "@/lib/sel/casel";
import { caseByCode, casesForSkill, type SkillId } from "@/lib/skills";
import { LIMITS, toSkillId } from "./shared";
import type { Answers, PracticeState, PracticeStep, Snapshot } from "./state";

/** Các cột của practice_sessions cần để dựng lại trạng thái. */
export type SessionCols = {
  /** mô-đun luyện, đã đọc từ cột subskill (hoặc cột skill cũ) bằng skillOfRow */
  skill: SkillId;
  step: PracticeStep;
  state: PracticeState;
  hint_count: number;
  feedback_count: number;
  stall_count: number;
};

/** Trạng thái bài luyện dựng lại từ dữ liệu đã lưu; bài làm là lần mới nhất (lần 2 nếu có). */
export function snapshotFromRows(session: SessionCols, attempts: { version: 1 | 2; answers: Answers | null }[]): Snapshot {
  const latest = [...attempts].sort((a, b) => b.version - a.version)[0];
  return {
    skill: session.skill,
    step: session.step,
    state: session.state,
    hintCount: session.hint_count,
    feedbackCount: session.feedback_count,
    stallCount: session.stall_count,
    versions: attempts.length,
    answers: latest?.answers ?? {},
  };
}

/** Tình huống của bài luyện (để hiện và để đưa cho trợ lý): tình huống mẫu hoặc lời học sinh tự kể. */
export function situationFromRow(s: { case_code: string | null; own_situation: string | null }): { text: string | null; own: boolean } {
  if (s.own_situation) return { text: s.own_situation, own: true };
  return { text: caseByCode(s.case_code)?.situation ?? null, own: false };
}

export const START_ERRORS = {
  skill: "Chọn một kỹ năng nhé.",
  wrongCase: "Tình huống này không dùng cho kỹ năng đã chọn.",
  nothing: "Viết vài chữ về tình huống của bạn, hoặc chọn một tình huống mẫu nhé.",
} as const;

/**
 * Kiểm tra lựa chọn lúc mở bài. Có lời tự kể thì dùng lời đó (bỏ tình huống mẫu); không thì phải chọn một tình huống
 * mẫu đúng kỹ năng. Học sinh từ chối kể chuyện riêng vẫn luyện được bằng tình huống mẫu.
 */
export function parseStart(input: { subskill: unknown; caseCode?: unknown; ownSituation?: unknown }):
  | { ok: true; skill: SkillId; caseCode: string | null; ownSituation: string | null }
  | { ok: false; error: string } {
  // id kỹ năng thành phần đã có mô-đun luyện ("plan_step_by_step") hoặc slug ("go-roi-tung-buoc"); mã cũ không nhận ở đây
  const raw = typeof input.subskill === "string" ? input.subskill.trim() : "";
  const skill = toSkillId(isSubskillId(raw) ? raw : subskillBySlug(raw)?.id);
  if (!skill) return { ok: false, error: START_ERRORS.skill };
  const caseCode = input.caseCode ? String(input.caseCode) : null;
  const own = input.ownSituation ? String(input.ownSituation).replace(/\s+/g, " ").trim().slice(0, LIMITS.situation) : null;
  const ownSituation = own && own.length >= 4 ? own : null;
  if (caseCode && !casesForSkill(skill).some((c) => c.code === caseCode)) return { ok: false, error: START_ERRORS.wrongCase };
  if (!caseCode && !ownSituation) return { ok: false, error: START_ERRORS.nothing };
  return { ok: true, skill, caseCode: ownSituation ? null : caseCode, ownSituation };
}
