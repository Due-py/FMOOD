import Link from "next/link";
import { cn } from "@/components/ui/cn";

/** Nút trắng "chunky" (mẫu toi.html .go.white): viền và bóng màu đường kẻ, bấm thì lún xuống. */
export const btnWhite =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-line bg-surface px-4 py-2 text-sm font-bold text-ink shadow-[0_3px_0_var(--line)] transition duration-200 hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0_1px_0_var(--line)] motion-reduce:transition-none disabled:pointer-events-none disabled:opacity-50";

/**
 * Một hộp của trang Tôi (giao diện vui, mẫu toi.html): thẻ trắng bo 28px bóng mềm; đầu hộp có ô biểu tượng màu pastel,
 * tiêu đề chữ tròn, dòng phụ nhỏ và (tùy chọn) một nút bên phải.
 */
export function MeBox({
  icon,
  tint,
  title,
  sub,
  action,
  id,
  className,
  children,
}: {
  /** emoji hoặc hình nhỏ trong ô vuông bo tròn */
  icon: React.ReactNode;
  /** lớp nền của ô biểu tượng, ví dụ "bg-c4" */
  tint: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  action?: React.ReactNode;
  id?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={cn("rounded-[1.75rem] bg-surface p-4 shadow-soft sm:p-5 dark:border dark:border-line", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <span aria-hidden className={cn("grid size-[2.875rem] shrink-0 place-items-center rounded-2xl text-2xl", tint)}>
          {icon}
        </span>
        <div className="min-w-40 flex-1">
          <h2 id={id} className="font-display text-[1.35rem] font-extrabold leading-tight tracking-tight">
            {title}
          </h2>
          {sub && <p className="text-[13px] text-muted">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Nút "← Tôi" quay về trang Tôi (trang Hồ sơ, Cài đặt). */
export function BackToMe() {
  return (
    <Link href="/me" className={cn(btnWhite, "pl-3")}>
      <span aria-hidden>←</span> Tôi
    </Link>
  );
}

/** Đầu trang con của Tôi: ô biểu tượng nghiêng + tiêu đề tròn + một câu ngắn. */
export function MeSubHeader({ emoji, tint, title, lead }: { emoji: string; tint: string; title: string; lead: string }) {
  return (
    <header className="mt-4 flex items-center gap-3">
      <span aria-hidden className={cn("grid size-14 shrink-0 -rotate-6 place-items-center rounded-[1.25rem] text-3xl shadow-soft", tint)}>
        {emoji}
      </span>
      <div className="min-w-0">
        <h1 className="font-display text-[1.75rem] font-extrabold leading-tight tracking-tight sm:text-3xl">{title}</h1>
        <p className="text-sm text-muted">{lead}</p>
      </div>
    </header>
  );
}
