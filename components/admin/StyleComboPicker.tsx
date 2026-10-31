"use client";

import {
  CHARACTER_KEYS,
  GROUP_LABEL,
  GUIDANCE_KEYS,
  LENGTH_KEYS,
  MOTIVATION_KEYS,
  optionLabel,
  STYLE_GROUPS,
  type ChatStyle,
  type StyleGroup,
} from "@/lib/ai/chat-style";
import { input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

const KEYS: Record<StyleGroup, readonly string[]> = {
  character: CHARACTER_KEYS,
  length: LENGTH_KEYS,
  guidance: GUIDANCE_KEYS,
  motivation: MOTIVATION_KEYS,
};

/** Chọn một tổ hợp nhân vật và tùy chọn (sân thử, xem lời dặn đầy đủ của trang admin). */
export function StyleComboPicker({ value, onChange, className }: { value: ChatStyle; onChange: (s: ChatStyle) => void; className?: string }) {
  return (
    <div className={cn("grid gap-2 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {STYLE_GROUPS.map((g) => (
        <label key={g} className="block text-xs font-semibold text-muted">
          {GROUP_LABEL[g]}
          <select
            value={value[g]}
            onChange={(e) => onChange({ ...value, [g]: e.target.value } as ChatStyle)}
            className={cn(input, "mt-1 py-2 text-sm font-normal text-ink")}
          >
            {KEYS[g].map((k) => (
              <option key={k} value={k}>
                {optionLabel(g, k)}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
