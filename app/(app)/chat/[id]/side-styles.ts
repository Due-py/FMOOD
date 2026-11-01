// CHUẨN CHUNG cho 4 thẻ panel phải Học cùng AI (Ghi chú · Kỹ năng · Lịch sử · Cài đặt), Duy 01/11: cùng cỡ chữ, cùng bố cục.
// Mỗi thẻ: tiêu đề (14px đậm) + một dòng mô tả (12px), rồi các nhóm (tên nhóm 12px in hoa) gồm các dòng (14px, chữ phụ 12px),
// hành động là một dòng chữ màu. Mọi chữ thẳng MỘT lề trái: chữ cách mép nội dung 12px (px-3); nền khi rê chuột của dòng
// chạy hết bề ngang.
export const side = {
  head: "mb-4",
  title: "px-3 text-sm font-bold text-ink",
  desc: "mt-0.5 px-3 text-xs text-muted",
  group: "px-3 text-xs font-semibold uppercase tracking-wide text-muted",
  /** danh sách dưới tên nhóm */
  list: "mt-1 space-y-0.5",
  row: "flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-surface-2",
  rowTitle: "block font-semibold",
  rowSub: "block text-xs text-muted",
  /** chữ thường trong thẻ (lời nhắc khi trống, nội dung ghi chú) */
  text: "px-3 text-sm",
  action: "flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-brand-strong transition hover:bg-brand-soft",
} as const;
