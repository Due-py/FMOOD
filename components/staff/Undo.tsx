"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { cn } from "@/components/ui/cn";

// NÚT "HOÀN TÁC" DÙNG CHUNG Ở TRANG THẦY CÔ
// Sau mỗi thao tác, một thông báo nhỏ hiện ở cuối màn hình trong 8 giây:
// "Đã đánh dấu xong · Hoàn tác". Bấm Hoàn tác thì gọi thao tác ngược lại.

type UndoResult = { ok: true } | { ok: false; error: string };
type Offer = { id: number; message: string; undo?: () => Promise<UndoResult> };

const SHOW_MS = 8000;

const UndoContext = createContext<(message: string, undo?: () => Promise<UndoResult>) => void>(() => {});

/** offer("Đã lưu", () => hoanTac()) — không truyền undo thì chỉ báo đã xong. */
export function useUndo() {
  return useContext(UndoContext);
}

export function UndoProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const close = useCallback(() => {
    setOffer(null);
    setResult(null);
  }, []);

  const show = useCallback(
    (message: string, undo?: () => Promise<UndoResult>) => {
      setResult(null);
      setOffer({ id: ++seq.current, message, undo });
    },
    [],
  );

  // tự ẩn sau 8 giây (đếm lại từ đầu với mỗi thông báo mới, và khi vừa hoàn tác xong)
  useEffect(() => {
    if (!offer) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(close, result ? 3000 : SHOW_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [offer, result, close]);

  function undo() {
    const fn = offer?.undo;
    if (!fn) return;
    start(async () => {
      const res = await fn();
      setResult(res.ok ? { ok: true, text: "Đã hoàn tác." } : { ok: false, text: res.error });
      router.refresh();
    });
  }

  return (
    <UndoContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 md:pl-64">
        {offer && (
          <div
            key={offer.id}
            role="status"
            className="fm-rise pointer-events-auto flex max-w-md items-center gap-3 rounded-full bg-ink py-2 pl-5 pr-2 text-sm text-bg shadow-[0_12px_32px_-12px_rgba(0,0,0,0.5)]"
          >
            <span className={cn("py-1.5", result && !result.ok && "text-danger-soft")}>{result ? result.text : offer.message}</span>
            {offer.undo && !result && (
              <button
                type="button"
                onClick={undo}
                disabled={pending}
                className="rounded-full bg-bg/15 px-4 py-1.5 font-bold text-bg transition hover:bg-bg/25 disabled:opacity-60"
              >
                {pending ? "Đang hoàn tác…" : "Hoàn tác"}
              </button>
            )}
            <button type="button" onClick={close} aria-label="Đóng thông báo" className="rounded-full px-2 py-1.5 text-bg/70 hover:text-bg">
              ✕
            </button>
          </div>
        )}
      </div>
    </UndoContext.Provider>
  );
}
