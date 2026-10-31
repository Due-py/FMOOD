"use client";

import { useEffect, useState, useTransition } from "react";
import { saveChatStyle } from "@/app/actions/chat-style";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import {
  CHARACTER_KEYS,
  CHARACTERS,
  GROUP_LABEL,
  GUIDANCE_KEYS,
  GUIDANCE_LABEL,
  LENGTH_KEYS,
  LENGTH_LABEL,
  MOTIVATION_KEYS,
  MOTIVATION_LABEL,
  type ChatStyle,
} from "@/lib/ai/chat-style";

/**
 * Bảng chọn nhân vật và cách trò chuyện (Bước 9.4): mở khi bấm tên nhân vật ở đầu trang Trò chuyện.
 * Lưu vào hồ sơ của chính học sinh; áp dụng từ tin nhắn tiếp theo.
 */
export function ChatStyleSheet({ value, onSaved, onClose }: { value: ChatStyle; onSaved: (s: ChatStyle) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<ChatStyle>(value);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <G extends keyof ChatStyle>(g: G, v: ChatStyle[G]) => setDraft((d) => ({ ...d, [g]: v }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveChatStyle(draft);
      if (res.ok) onSaved(draft);
      else setError(res.error);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-style-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:rounded-[2rem]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="chat-style-title" className="font-display text-xl font-bold tracking-tight">
              Trò chuyện theo cách của bạn
            </h2>
            <p className="mt-1 text-sm text-muted">Chỉ đổi giọng văn và độ dài. Áp dụng từ tin nhắn tiếp theo.</p>
          </div>
          <button type="button" onClick={onClose} className={cn(btn.ghost, "-mr-2 px-3")} aria-label="Đóng">
            ✕
          </button>
        </div>

        <fieldset className="mt-5">
          <legend className="text-sm font-semibold">{GROUP_LABEL.character}</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {CHARACTER_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={draft.character === k}
                onClick={() => set("character", k)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-3xl border-2 p-3 text-center transition",
                  draft.character === k ? "border-brand bg-brand-soft" : cn("border-transparent", CHARACTERS[k].tone),
                )}
              >
                <span aria-hidden className="text-3xl leading-none">
                  {CHARACTERS[k].emoji}
                </span>
                <span className="font-display font-bold">{CHARACTERS[k].name}</span>
                <span className="text-[0.7rem] leading-snug text-muted">{CHARACTERS[k].traits}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <ChoiceGroup title={GROUP_LABEL.length} keys={LENGTH_KEYS} labels={LENGTH_LABEL} value={draft.length} onPick={(k) => set("length", k)} />
        <ChoiceGroup title={GROUP_LABEL.guidance} keys={GUIDANCE_KEYS} labels={GUIDANCE_LABEL} value={draft.guidance} onPick={(k) => set("guidance", k)} />
        <ChoiceGroup title={GROUP_LABEL.motivation} keys={MOTIVATION_KEYS} labels={MOTIVATION_LABEL} value={draft.motivation} onPick={(k) => set("motivation", k)} />

        {error && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={save} disabled={pending} className={cn(btn.primary, "flex-1")}>
            {pending ? "Đang lưu…" : "Lưu"}
          </button>
          <button type="button" onClick={onClose} className={btn.secondary}>
            Thôi
          </button>
        </div>
      </div>
    </div>
  );
}

function ChoiceGroup<K extends string>({
  title,
  keys,
  labels,
  value,
  onPick,
}: {
  title: string;
  keys: readonly K[];
  labels: Record<K, { label: string; hint: string }>;
  value: K;
  onPick: (k: K) => void;
}) {
  return (
    <fieldset className="mt-5">
      <legend className="text-sm font-semibold">{title}</legend>
      <div className="mt-2 space-y-1.5">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={value === k}
            onClick={() => onPick(k)}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 text-left transition",
              value === k ? "border-brand bg-brand-soft" : "border-line hover:bg-surface-2",
            )}
          >
            <span className="font-semibold">{labels[k].label}</span>
            <span className="text-xs text-muted">{labels[k].hint}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
