"use client";

import Link from "next/link";
import { pressedHelpButton } from "@/app/actions/activity";
import { PhoneIcon } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";

/** Nút "Cần giúp" mở trang số gọi khẩn cấp + báo thầy cô. Luôn có ở mọi trang của học sinh. */
/** `compactLabel`: menu trái ở màn vừa (768–1023px) chỉ có biểu tượng, chữ "Cần giúp" hiện từ 1024px (trình đọc màn hình luôn đọc được). */
export function HelpButton({ className, compactLabel = false }: { className?: string; compactLabel?: boolean }) {
  return (
    <Link
      href="/giup-do"
      // nhật ký đợt thử: chỉ ghi là đã bấm, không chờ, không chặn việc mở trang
      onClick={() => void pressedHelpButton().catch(() => {})}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-danger/40 bg-danger-soft px-3.5 py-2 text-sm font-bold text-danger transition hover:border-danger",
        className,
      )}
    >
      <PhoneIcon size={16} />
      {compactLabel ? <span className="sr-only lg:not-sr-only">Cần giúp</span> : "Cần giúp"}
    </Link>
  );
}
