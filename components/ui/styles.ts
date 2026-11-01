// Kiểu nút và thẻ dùng chung. Bảng màu kem · bơ · mận (01/11): nút chính nền bơ, chữ mận, viền nghệ đậm, không bóng màu.
export const btn = {
  primary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-brand-edge bg-brand px-6 py-2.5 font-bold text-brand-ink transition duration-300 hover:-translate-y-0.5 hover:brightness-[1.03] active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 font-semibold text-ink transition duration-300 hover:border-ink/25 hover:bg-surface-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
  ghost:
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 font-medium text-muted transition duration-300 hover:bg-surface-2 hover:text-ink disabled:opacity-50",
  danger:
    "inline-flex items-center justify-center gap-2 rounded-full bg-danger px-5 py-2.5 font-semibold text-white transition duration-300 hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
  /** nút chữ IN HOA nhỏ, giãn chữ (như "DONATE" trong mẫu) */
  cta: "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-brand-edge bg-brand px-6 py-2.5 text-xs font-extrabold uppercase tracking-[0.12em] text-brand-ink transition duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50",
  /** nút viền chữ IN HOA nhỏ */
  outline:
    "inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-xs font-extrabold uppercase tracking-[0.12em] text-ink transition duration-300 hover:border-ink/30",
  /** nút tròn có mũi tên ↗ */
  round:
    "inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink transition duration-300 hover:border-brand-edge hover:bg-brand hover:text-brand-ink",
};

/** thẻ trắng bo tròn lớn; rê chuột thì chuyển nền kem (kèm class "group" để nút con đổi màu) */
export const card =
  "rounded-[var(--radius-card)] border border-line bg-surface p-5 transition-[background,border-color,box-shadow,transform] duration-500";

export const cardHover =
  "group hover:border-transparent hover:bg-gradient-to-b hover:from-cream hover:to-surface hover:shadow-[0_18px_40px_-24px_rgba(60,40,10,0.35)]";

export const input =
  "w-full rounded-2xl border border-transparent bg-field px-4 py-3 text-base text-ink placeholder:text-muted outline-none transition duration-300 focus:border-brand-edge focus:ring-4 focus:ring-brand/40";

/** nhãn nhỏ dạng viên thuốc màu xanh, như "What We Do" trong mẫu */
export const pill =
  "inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-strong";
