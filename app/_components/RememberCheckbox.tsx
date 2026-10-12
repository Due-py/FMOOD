"use client";

import { useSyncExternalStore } from "react";
import { parseSavedLogin, readSavedLoginRaw, type SavedLogin } from "@/lib/remember";

const noop = () => () => {};

/** Thông tin đăng nhập đã nhớ trên máy này (server và lần render đầu: null). */
export function useSavedLogin(): SavedLogin | null {
  const raw = useSyncExternalStore(noop, readSavedLoginRaw, () => null);
  return parseSavedLogin(raw);
}

/** Ô "Nhớ tài khoản" dùng chung cho đăng nhập học sinh và thầy cô. */
export function RememberCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl px-1 py-1 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[var(--brand-strong)]"
      />
      <span>
        <span className="font-semibold">Nhớ tài khoản</span>
        <span className="block text-xs text-muted">
          Lần sau mở F-Mood là vào thẳng, không cần đăng nhập lại. Đừng tick trên máy dùng chung.
        </span>
      </span>
    </label>
  );
}
