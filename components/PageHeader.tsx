import type { ReactNode } from "react";
import { pill } from "@/components/ui/styles";

/** Tiêu đề trang: nhãn viên thuốc xanh + tiêu đề chữ đậm (theo mẫu Inspiration 1). */
export function PageHeader({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="fm-rise mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <span className={pill}>{eyebrow}</span>}
        <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.025em] sm:text-5xl">{title}</h1>
        {children}
      </div>
      {action}
    </header>
  );
}
