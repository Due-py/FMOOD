// Kiểu dùng chung của trang Cần giúp (giao diện vui, mẫu can-giup.html).

/** thẻ trắng bo 28px bóng mềm */
export const helpCard = "rounded-[1.75rem] bg-surface p-4 shadow-soft sm:p-5 dark:border dark:border-line";

/** ô nhập: nền kem, viền 2px, bấm vào thì viền tím nhạt */
export const helpInput =
  "block w-full resize-none rounded-[1.15rem] border-2 border-line bg-surface-2/50 px-3.5 py-2.5 text-base text-ink placeholder:text-muted outline-none transition focus:border-c1-mid focus:bg-surface focus:ring-4 focus:ring-c1/60";

/** nút đỏ to cho việc gấp (bóng đỏ đậm dưới đáy, bấm thì lún xuống); tối: chữ sẫm trên đỏ nhạt để đủ tương phản */
export const btnUrgent =
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-[color-mix(in_srgb,var(--danger)_70%,black)] bg-danger px-5 py-3 text-[17px] font-extrabold text-white shadow-[0_3px_0_color-mix(in_srgb,var(--danger)_70%,black)] transition active:translate-y-0.5 active:shadow-[0_1px_0_color-mix(in_srgb,var(--danger)_70%,black)] disabled:opacity-60 dark:text-danger-soft motion-reduce:transition-none";

/** nút trắng "chunky" */
export const btnWhite =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-line bg-surface px-5 py-2 font-bold text-ink shadow-[0_3px_0_var(--line)] transition duration-200 active:translate-y-0.5 active:shadow-[0_1px_0_var(--line)] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none";

/** nút chữ gạch chân (lựa chọn phụ) */
export const btnLink =
  "inline-flex min-h-11 items-center justify-center px-2 font-bold text-muted underline underline-offset-[3px] transition hover:text-ink disabled:opacity-50";

/** Đầu thẻ: ô biểu tượng màu + tiêu đề tròn + dòng phụ. */
export function CardHead({ emoji, tint, title, sub }: { emoji: string; tint: string; title: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden className={`grid size-[2.875rem] shrink-0 place-items-center rounded-2xl text-[1.4rem] ${tint}`}>
        {emoji}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-[1.3rem] font-extrabold leading-tight tracking-tight">{title}</h2>
        {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
      </div>
    </div>
  );
}
