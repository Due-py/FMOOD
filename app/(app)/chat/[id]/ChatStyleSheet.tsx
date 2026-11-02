"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { saveChatStyle } from "@/app/actions/chat-style";
import { CharacterAvatar } from "@/components/mascot/CharacterAvatar";
import { CheckIcon } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";
import { btn } from "@/components/ui/styles";
import { floating } from "./chat-ui";
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
  type CharacterKey,
  type ChatStyle,
} from "@/lib/ai/chat-style";

/**
 * Nhân vật và cách trò chuyện (Bước 9.4), lưu vào hồ sơ của chính học sinh, áp dụng từ tin nhắn tiếp theo.
 * Duy 01/11: bấm tên nhân vật ở đầu trang mở danh sách thả xuống 3 nhân vật (CharacterMenu), chọn là đổi ngay (trước là
 * bảng nổi gồm cả cách trò chuyện); độ dài, cách dẫn dắt, động lực nằm ở thẻ Cài đặt của panel phải (ChatStyleForm).
 */
export function CharacterMenu({
  value,
  onSaved,
  avatar,
  subtitle,
}: {
  value: ChatStyle;
  onSaved: (s: ChatStyle) => void;
  /** ảnh nhân vật đang dùng (đầu trang đổi vẻ mặt khi trợ lý đang nghĩ) */
  avatar: React.ReactNode;
  /** dòng nhỏ dưới tên (ví dụ "đang nghĩ…"); không có thì "bạn đồng hành AI · đổi nhân vật" */
  subtitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  const current = CHARACTERS[value.character];

  // bấm ra ngoài hoặc Esc thì đóng
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(k: CharacterKey) {
    setOpen(false);
    if (k === value.character) return;
    setError(null);
    const next = { ...value, character: k };
    startTransition(async () => {
      const res = await saveChatStyle(next);
      if (res.ok) onSaved(next);
      else setError(res.error);
    });
  }

  return (
    <div ref={box} className="relative -ml-1 min-w-[4.5rem] flex-1 min-[380px]:min-w-[6.5rem]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${current.name}: đổi nhân vật`}
        className="flex max-w-full items-center gap-2.5 rounded-full py-1 pl-1 pr-3.5 text-left transition hover:bg-surface hover:shadow-soft aria-expanded:bg-surface aria-expanded:shadow-soft"
      >
        {avatar}
        <span className="min-w-0">
          <span className="block whitespace-nowrap font-display text-[19px] font-bold leading-[1.05] sm:text-[21px]">
            {current.name} <span aria-hidden className={cn("inline-block text-[13px] text-muted transition-transform", open && "rotate-180")}>▾</span>
          </span>
          <span className="block truncate text-xs text-muted">{pending ? "đang đổi…" : (subtitle ?? "bạn đồng hành AI · đổi nhân vật")}</span>
        </span>
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
      {open && (
        <div role="menu" aria-label="Đổi nhân vật" className={cn(floating, "absolute left-0 top-full z-20 mt-1.5 w-[300px] max-w-[calc(100vw-2rem)] animate-[fadein_.15s_ease]")}>
          {CHARACTER_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              role="menuitemradio"
              aria-checked={value.character === k}
              onClick={() => pick(k)}
              className={cn("flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition", value.character === k ? "bg-c1" : "hover:bg-bg")}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-surface shadow-soft">
                <CharacterAvatar size={34} float={false} character={k} mood="happy" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{CHARACTERS[k].name}</span>
                <span className="block text-xs leading-snug text-muted">{CHARACTERS[k].traits}</span>
              </span>
              {value.character === k && <CheckIcon size={18} className="shrink-0 text-c1-ink" />}
            </button>
          ))}
          <p className="px-2.5 pb-1 pt-1.5 text-xs text-muted">Áp dụng từ tin nhắn tiếp theo.</p>
        </div>
      )}
    </div>
  );
}

/** Độ dài, cách dẫn dắt, động lực; nút Lưu (thẻ Cài đặt của panel phải). Giữ nguyên nhân vật đang chọn. */
export function ChatStyleForm({ value, onSaved }: { value: ChatStyle; onSaved: (s: ChatStyle) => void }) {
  const [draft, setDraft] = useState<ChatStyle>(value);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const set = <G extends keyof ChatStyle>(g: G, v: ChatStyle[G]) => {
    setSaved(false);
    setDraft((d) => ({ ...d, [g]: v }));
  };

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveChatStyle(draft);
      if (res.ok) {
        setSaved(true);
        onSaved(draft);
      } else setError(res.error);
    });
  }

  return (
    <div className="@container">
      <div className="mt-3 space-y-3">
        <ChoiceGroup title={GROUP_LABEL.length} keys={LENGTH_KEYS} labels={LENGTH_LABEL} value={draft.length} onPick={(k) => set("length", k)} />
        <ChoiceGroup title={GROUP_LABEL.guidance} keys={GUIDANCE_KEYS} labels={GUIDANCE_LABEL} value={draft.guidance} onPick={(k) => set("guidance", k)} />
        <ChoiceGroup title={GROUP_LABEL.motivation} keys={MOTIVATION_KEYS} labels={MOTIVATION_LABEL} value={draft.motivation} onPick={(k) => set("motivation", k)} />
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
      {/* nút chính bơ có bóng nghệ (mẫu 02/11), chữ 14px như các dòng trong panel */}
      <button type="button" onClick={save} disabled={pending} className={cn(btn.primary, "mt-3.5 w-full px-4 py-2 text-sm")}>
        {pending ? "Đang lưu…" : "Lưu"}
      </button>
      {saved && (
        <p role="status" className="mt-2 text-[13px] text-muted">
          ✓ Đã lưu. Áp dụng từ tin nhắn tiếp theo.
        </p>
      )}
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
    <fieldset>
      {/* tên nhóm 12px in hoa; mỗi lựa chọn một ô nền kem bo 16px, đang chọn nền bơ nhạt viền nghệ (mẫu 02/11) */}
      <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">{title}</legend>
      <div className="space-y-1.5">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={value === k}
            onClick={() => onPick(k)}
            className={cn(
              // panel phải hẹp: chữ gợi ý xuống dòng dưới tên; panel rộng (≥ 24rem): cùng một hàng
              "flex min-h-11 w-full flex-col items-start justify-center gap-0.5 rounded-2xl border-2 px-3 py-2 text-left transition @sm:flex-row @sm:items-center @sm:justify-between @sm:gap-3",
              value === k ? "border-brand-edge bg-brand-soft" : "border-transparent bg-bg hover:bg-surface-2",
            )}
          >
            <span className="text-sm font-bold">{labels[k].label}</span>
            <span className="text-xs leading-snug text-muted">{labels[k].hint}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
