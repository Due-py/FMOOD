// THẺ "MUỐN LUYỆN MỘT KỸ NĂNG KHÔNG?" VÀ PANEL "TRONG CUỘC TRÒ CHUYỆN NÀY" (kế hoạch V2 mục 4, 10; hàm thuần, có test).
// Máy chủ quyết định LÚC hiện thẻ, AI không tự gắn: chỉ khi học sinh đã đồng ý gỡ từng bước, lượt thường (không đáng lo),
// tới bước chọn cách ứng phó, và chưa hiện cho chuyện này. Thẻ chỉ GỢI Ý tối đa 2 kỹ năng; học sinh tự chọn
// (hoặc "Chưa biết chọn gì" / "Tiếp tục trò chuyện"). Bấm chọn chỉ mang tên kỹ năng sang trang chọn tình huống, không mang lời chat.
import { SKILL_CARD_MOVES, type SelMove, type SelState } from "@/lib/sel/engine";
import { subskill } from "@/lib/sel/casel";
import { isSkillId, type SkillId } from "@/lib/skills";

/** Bài đọc thư viện đã duyệt mà người duyệt nối với kỹ năng (ô "Nối với bài luyện"); máy chủ gắn sau, không do AI chọn. */
export type OfferReading = { slug: string; title: string; emoji: string };

export type OfferSkill = { id: SkillId; name: string; slug: string; readings?: OfferReading[] };

/** Số lượt tối thiểu trước khi hiện thẻ luyện. */
export const MIN_TURNS = 3;

/** Học sinh đang nói về mục tiêu (có dấu, không dấu, "SMART"): gợi "Đặt mục tiêu nhỏ và theo dõi". */
const GOAL_WORDS = /mục tiêu|muc tieu|\bsmart\b/i;

/**
 * Kỹ năng gợi ý (tối đa 2) hoặc null khi không hiện thẻ.
 * Ứng viên lấy từ điều học sinh đã nói (đã chọn cách, đã chốt bước, cảm xúc đã gọi tên, có người khác liên quan);
 * bước hội thoại chỉ là tín hiệu thời điểm. Không đủ căn cứ thì vẫn hiện thẻ nhưng không gợi tên (học sinh chọn từ danh sách).
 * `said` = tin nhắn học sinh vừa gửi (chỉ để nhận ra chuyện mục tiêu, không lưu).
 */
export function practiceOffer(move: SelMove, state: SelState, gentle: boolean, said = ""): OfferSkill[] | null {
  if (gentle || state.mode !== "trong-mach" || state.offered || !SKILL_CARD_MOVES.includes(move)) return null;
  // đã chọn "chỉ kể" với chuyện này thì không mời luyện, kể cả khi sau đó hỏi cách làm (không mời lặp trong cùng chuyện)
  if (state.declinedAt !== null) return null;
  // không ở mấy lượt đầu: ít nhất 3 lượt trao đổi (thử thật 01/11: thẻ hiện ngay lượt đầu "không biết bắt đầu từ đâu")
  if (state.turns < MIN_TURNS) return null;
  const picks: SkillId[] = [];
  const add = (id: string) => {
    if (isSkillId(id) && !picks.includes(id) && picks.length < 2) picks.push(id);
  };
  if (move === "loi-nho") add("ask_for_help");
  const told = [said, state.choice, state.step, state.known.event, state.known.thought].filter(Boolean).join(" ").normalize("NFC");
  if (GOAL_WORDS.test(told)) add("set_small_goal");
  if (state.choice || state.step || move === "phan-tu" || move === "dua-lua-chon" || move === "chot-buoc-nho") add("plan_step_by_step");
  if (state.other) add("see_other_side");
  if (state.known.emotion) add("calm_in_the_moment");
  if (state.known.thought) add("recognize_feelings_thoughts");
  return picks.map((id) => ({ id, name: subskill(id).name, slug: subskill(id).slug }));
}

export type SelPanel = {
  /** điều học sinh đã xác nhận "đúng rồi" sau bản tóm tắt (lời học sinh, đã qua xác nhận) */
  confirmed: { label: string; text: string }[];
  /** cách học sinh đã chọn, nguyên văn */
  choice: string | null;
  /** bước nhỏ đã chốt, nguyên văn */
  step: string | null;
  /** việc đã thử và kết quả học sinh kể */
  tried: { what: string; worked: boolean }[];
};

const CONFIRMED_LABEL = { event: "Chuyện xảy ra", emotion: "Cảm xúc", thought: "Điều bạn nghĩ", body: "Cơ thể" } as const;

/** Panel chỉ hiện điều HỌC SINH nói và đã xác nhận / đã chọn; không hiện suy đoán của AI. */
export function selPanel(state: SelState): SelPanel {
  const confirmed = (Object.keys(CONFIRMED_LABEL) as (keyof typeof CONFIRMED_LABEL)[])
    .filter((k) => state.confirmed[k])
    .map((k) => ({ label: CONFIRMED_LABEL[k], text: state.confirmed[k]! }));
  return {
    confirmed,
    choice: state.choice,
    step: state.step,
    tried: state.tried.map((t) => ({ what: t.what, worked: t.result === "worked" })),
  };
}

export const isPanelEmpty = (p: SelPanel) => !p.confirmed.length && !p.choice && !p.step && !p.tried.length;
