"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setDemoMode } from "@/app/actions/demo";
import { cn } from "@/components/ui/cn";

/** Thanh luôn hiện trên đầu mọi trang thầy cô khi admin đang trình diễn (cả khi in). */
export function DemoBanner({ hasData }: { hasData: boolean }) {
  return (
    <div
      role="status"
      className="sticky top-0 z-40 -mx-4 mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-b-2 border-dashed border-ink/20 bg-butter px-4 py-2.5 sm:-mx-6 sm:px-6 print:static print:mx-0 print:border-2"
    >
      <span className="flex items-center gap-2 font-display font-extrabold tracking-tight">
        <span aria-hidden>🎬</span> Đang trình diễn
      </span>
      <span className="min-w-0 flex-1 text-sm">
        {hasData
          ? "Chỉ hiện DỮ LIỆU MẪU của 3 lớp mẫu. Học sinh thật không xuất hiện và không bị ảnh hưởng."
          : "Chưa có dữ liệu mẫu: vào Mục lục trình diễn để tạo."}
      </span>
      <span className="flex items-center gap-2 print:hidden">
        <Link href="/staff/trinh-dien" className="rounded-full bg-surface/80 px-3 py-1.5 text-sm font-semibold hover:bg-surface">
          Mục lục trình diễn
        </Link>
        <DemoToggle on compact />
      </span>
    </div>
  );
}

/** Nút bật / tắt chế độ trình diễn. */
export function DemoToggle({ on, compact = false }: { on: boolean; compact?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setDemoMode(!on);
          router.refresh();
        })
      }
      className={cn(
        "inline-flex items-center gap-2 rounded-full font-bold transition disabled:opacity-50",
        compact ? "bg-ink px-3 py-1.5 text-sm text-surface hover:opacity-90" : on ? "bg-ink px-6 py-3 text-surface hover:opacity-90" : "bg-brand px-6 py-3 text-brand-ink hover:-translate-y-0.5",
      )}
    >
      {pending ? "Đang chuyển…" : on ? "Tắt trình diễn" : "🎬 Bật chế độ trình diễn"}
    </button>
  );
}
