"use client";

import { useEffect, useState } from "react";
import { CloseIcon } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

/**
 * Ngăn kéo thay cho panel phải khi màn hình < 1280px (khu Kỹ năng: danh sách, chọn tình huống, bài luyện).
 * Cùng dáng ngăn kéo Học cùng AI: điện thoại kéo lên từ dưới, từ 640px trượt từ mép phải, nền kem; nút ✕ cùng hàng tiêu đề
 * của nội dung (không thêm hàng "Đóng" riêng). Esc hoặc bấm ra ngoài thì đóng.
 */
export function SideSheet({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    // m-0: nằm trong khối space-y-* của trang thì không bị cộng lề (lề dưới 24px làm ngăn kéo hụt đáy, lộ thanh tab)
    <div className="fixed inset-0 z-50 m-0 animate-[fadein_.15s_ease] bg-ink/25 xl:hidden" role="dialog" aria-modal="true" aria-label={label} onClick={onClose}>
      <div
        className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[1.5rem] bg-bg px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:inset-y-0 sm:left-auto sm:max-h-none sm:w-[min(360px,90vw)] sm:rounded-l-[1.5rem] sm:rounded-tr-none sm:border-l sm:border-line"
        onClick={(e) => e.stopPropagation()}
      >
        <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-line sm:hidden" />
        <div className="relative pt-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            title="Đóng"
            className="absolute -right-2 top-2 grid size-11 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            <CloseIcon size={20} />
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Nút mở ngăn kéo (chỉ hiện < 1280px), dùng ở trang máy chủ: nội dung ngăn kéo truyền qua children. */
export function SideSheetButton({ icon, label, className, children }: { icon: string; label: string; className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={cn(btn.secondary, "w-full justify-between px-4 py-2.5 text-sm xl:hidden", className)}
      >
        <span>
          <span aria-hidden>{icon} </span>
          {label}
        </span>
        <span aria-hidden>›</span>
      </button>
      {open && (
        <SideSheet label={label} onClose={() => setOpen(false)}>
          {children}
        </SideSheet>
      )}
    </>
  );
}
