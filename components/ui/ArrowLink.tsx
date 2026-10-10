import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";

/** Dòng chữ IN HOA nhỏ kèm nút tròn ↗ (như "LEARN MORE ↗" trong mẫu). */
export function ArrowLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "group/arrow inline-flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-[0.12em] text-ink",
        className,
      )}
    >
      {children}
      <RoundArrow />
    </Link>
  );
}

/** Nút tròn viền mảnh có mũi tên ↗; đổi xanh khi rê vào thẻ/đường dẫn cha (group). */
export function RoundArrow({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink transition duration-500",
        "group-hover:rotate-45 group-hover:border-brand group-hover:bg-brand group-hover:text-brand-ink",
        "group-hover/arrow:rotate-45 group-hover/arrow:border-brand group-hover/arrow:bg-brand group-hover/arrow:text-brand-ink",
        className,
      )}
    >
      <ArrowUpRight size={16} />
    </span>
  );
}
