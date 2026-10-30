"use client";

import { useState } from "react";
import { cn } from "@/components/ui/cn";
import { HABIT_ICON_GROUPS, isHabitIcon } from "@/lib/habit-icons";

/**
 * Chọn biểu tượng cho thói quen: theo nhóm, hoặc tự gõ một emoji từ bàn phím điện thoại.
 * Nút đủ to để bấm bằng ngón cái (44px).
 */
export function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  const [own, setOwn] = useState("");
  const [error, setError] = useState(false);
  const custom = !HABIT_ICON_GROUPS.some((g) => g.icons.includes(value));

  return (
    <div className="space-y-3" role="radiogroup" aria-label="Biểu tượng">
      {HABIT_ICON_GROUPS.map((g) => (
        <div key={g.label}>
          <p className="mb-1.5 text-xs font-semibold text-muted">{g.label}</p>
          <div className="grid grid-cols-8 gap-1.5">
            {g.icons.map((ic) => (
              <button
                key={ic}
                type="button"
                role="radio"
                aria-checked={value === ic}
                aria-label={`Biểu tượng ${ic}`}
                onClick={() => onChange(ic)}
                className={cn(
                  "flex aspect-square min-h-10 items-center justify-center rounded-xl text-xl transition",
                  value === ic ? "bg-brand-soft ring-2 ring-brand" : "bg-surface-2 hover:bg-line",
                )}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>
      ))}
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-muted">Hoặc tự chọn một emoji khác</span>
        <span className="flex items-center gap-2">
          <input
            value={own}
            onChange={(e) => {
              const v = e.target.value.trim();
              setOwn(v);
              setError(Boolean(v) && !isHabitIcon(v));
              if (isHabitIcon(v)) onChange(v);
            }}
            maxLength={16}
            inputMode="text"
            placeholder="Gõ 1 emoji, ví dụ 🦄"
            aria-label="Tự gõ một emoji"
            className="h-11 w-44 rounded-2xl border border-line bg-surface px-3 text-lg outline-none focus:border-brand focus:ring-4 focus:ring-brand/20"
          />
          {custom && value && (
            <span className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-2xl ring-2 ring-brand" aria-label={`Đang chọn ${value}`}>
              {value}
            </span>
          )}
        </span>
        {error && <span className="mt-1 block text-xs text-danger">Chỉ một emoji thôi nhé (không có chữ hay số).</span>}
      </label>
    </div>
  );
}
