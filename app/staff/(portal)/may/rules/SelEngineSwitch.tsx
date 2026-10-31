"use client";

import { useState, useTransition } from "react";
import { saveSettingAction } from "@/app/actions/admin";
import { cn } from "@/components/ui/cn";

/** Công tắc bộ điều phối SEL trong trò chuyện (cài đặt "sel.engine"). Tắt thì trò chuyện chỉ theo lời dặn như trước. */
export function SelEngineSwitch({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await saveSettingAction("sel.engine", { enabled: !on });
            if (res.ok) setOn(!on);
            else setError("Chưa lưu được. Thử lại nhé.");
          })
        }
        className={cn("relative h-8 w-14 shrink-0 rounded-full transition disabled:opacity-50", on ? "bg-[var(--series-pos)]" : "bg-surface-2 ring-1 ring-line")}
      >
        <span className={cn("absolute top-1 size-6 rounded-full bg-white shadow transition-all", on ? "left-7" : "left-1")} />
        <span className="sr-only">Bộ điều phối SEL</span>
      </button>
      <span className="text-sm font-semibold">{on ? "Đang bật: mỗi lượt chọn một bước SEL" : "Đã tắt: trò chuyện chỉ theo lời dặn"}</span>
      {error && <span className="text-sm text-danger">{error}</span>}
    </div>
  );
}
