import Link from "next/link";
import { PhoneIcon } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";

/** Nút "Cần giúp" mở trang số gọi khẩn cấp + báo thầy cô. Luôn có ở mọi trang của học sinh. */
export function HelpButton({ className }: { className?: string }) {
  return (
    <Link
      href="/giup-do"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-danger/40 bg-danger-soft px-3.5 py-2 text-sm font-bold text-danger transition hover:border-danger",
        className,
      )}
    >
      <PhoneIcon size={16} />
      Cần giúp
    </Link>
  );
}
