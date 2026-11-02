// GIAO DIỆN VUI CHO TRANG TRÒ CHUYỆN (mẫu tro-chuyen.html, tro-chuyen-dang-noi.html, Duy duyệt 02/11): thẻ bo tròn lớn,
// bóng mềm thay viền mảnh, màu pastel theo 5 nhóm năng lực (tone-1…5). Chỉ dùng trong khu chat; side-styles.ts giữ nguyên
// vì trang Luyện bài và SkillPanels còn dùng chuẩn cũ.
import { CASEL, subskill, type SubskillId } from "@/lib/sel/casel";

/** class tone-n (app/globals.css) của nhóm năng lực chính của một kỹ năng: con dùng bg-tint / text-tink / bg-tmid */
export const skillTone = (id: SubskillId) => `tone-${CASEL[subskill(id).primary].tone}`;

/** nền panel phải khi mở: nửa trắng nửa kem (đục, để thanh thẻ dính đầu panel che được nội dung cuộn bên dưới) */
export const PANEL_BG = "bg-[color-mix(in_srgb,var(--surface)_50%,var(--bg))]";

/** thẻ nổi (bảng chọn, danh sách thả xuống): trắng, bo 20px, bóng; chế độ tối thêm viền vì bóng khó thấy */
export const floating = "rounded-[20px] bg-surface p-1.5 shadow-[0_14px_40px_rgb(61_52_80/0.16)] dark:ring-1 dark:ring-line";

/** vùng bấm rộng thêm 2px mỗi phía (nút 40px trên điện thoại vẫn có vùng bấm 44px) */
export const hitArea = "relative after:absolute after:-inset-0.5 after:rounded-full after:content-['']";

/** cỡ nút tròn ở đầu trang: 40px trên điện thoại (đủ chỗ cho 5 nút ở 390px), 44px từ 640px */
export const headSize = "size-10 sm:size-11";

/** nút tròn trắng ở đầu trang (Trò chuyện mới) */
export const roundButton = `${hitArea} ${headSize} grid shrink-0 place-items-center rounded-full bg-surface text-muted shadow-soft transition hover:bg-brand-soft hover:text-ink`;

/** thẻ "vé" viền đứt (mời luyện, hỏi chủ đề, lưu chuyện bận lòng) */
export const ticket =
  "rounded-[26px] border-2 border-dashed border-brand/80 bg-surface p-4 shadow-soft dark:border-brand/35";

export const panelCard = {
  /** mỗi thẻ của panel phải là một thẻ trắng bo 26px */
  card: "rounded-[26px] bg-surface p-4 shadow-soft dark:ring-1 dark:ring-line",
  title: "font-display text-xl font-extrabold leading-tight",
  desc: "mt-0.5 text-[13px] text-muted",
  /** tên nhóm nhỏ in hoa */
  group: "mb-1.5 text-xs font-bold uppercase tracking-wide text-muted",
  /** đường dẫn cuối thẻ (nền bơ nhạt) */
  link: "mt-3 flex min-h-11 items-center justify-between gap-2 rounded-2xl bg-brand-soft px-3.5 text-[13.5px] font-bold text-brand-strong transition hover:bg-brand hover:text-brand-ink",
} as const;

// Câu mở đầu do thầy cô soạn (chuỗi chữ): đoán một emoji theo từ khóa cho ô thẻ; không khớp thì 💬
const STARTER_ICONS: [RegExp, string][] = [
  [/buồn|khóc|tủi|cô đơn/i, "🌧️"],
  [/học|thi|kiểm tra|bài tập|điểm/i, "📚"],
  [/vui|hào hứng|vui vẻ/i, "🎉"],
  [/cảm xúc|gọi tên/i, "🫧"],
  [/giận|bực|cáu/i, "🌋"],
  [/(^|\s)lo(\s|$)|sợ|áp lực|căng thẳng/i, "🌀"],
  [/bạn|nhóm|gia đình|bố|mẹ/i, "👥"],
  [/ngủ|mệt/i, "😴"],
];
export function starterIcon(text: string): string {
  return STARTER_ICONS.find(([re]) => re.test(text))?.[1] ?? "💬";
}
/** màu thẻ câu mở đầu xoay vòng như mẫu: xanh trời, bơ, bạc hà, tím nhạt, đào */
export const STARTER_TONES = ["tone-3", "tone-5", "tone-2", "tone-1", "tone-4"] as const;
