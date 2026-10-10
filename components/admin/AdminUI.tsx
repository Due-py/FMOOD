"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { resetSettingAction } from "@/app/actions/admin";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import type { SettingKey } from "@/lib/settings";

type ActionResult = { ok: true } | { ok: false; error: string };

/** Gọi một server action, theo dõi trạng thái đang lưu / đã lưu / lỗi. */
export function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  function run<T extends ActionResult>(fn: () => Promise<T>, success = "Đã lưu.", onOk?: (r: T) => void) {
    setStatus(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setStatus({ ok: true, text: success });
        onOk?.(res);
        router.refresh();
      } else setStatus({ ok: false, text: res.error });
    });
  }
  return { pending, status, setStatus, run };
}

export function StatusText({ status }: { status: { ok: boolean; text: string } | null }) {
  if (!status) return null;
  return (
    <p role={status.ok ? "status" : "alert"} className={cn("text-sm", status.ok ? "text-brand-strong dark:text-brand" : "text-danger")}>
      {status.text}
    </p>
  );
}

/** Thanh nút lưu + khôi phục mặc định cho một mục cài đặt. */
export function SaveBar({
  pending,
  status,
  settingKey,
  label = "Lưu thay đổi",
}: {
  pending: boolean;
  status: { ok: boolean; text: string } | null;
  settingKey?: SettingKey;
  label?: string;
}) {
  const router = useRouter();
  const [resetting, startReset] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
      <button type="submit" disabled={pending} className={btn.primary}>
        {pending ? "Đang lưu…" : label}
      </button>
      {settingKey && (
        <button
          type="button"
          disabled={resetting}
          className={btn.ghost}
          onClick={() => {
            if (confirm("Khôi phục về nội dung mặc định? Những gì đã sửa sẽ mất.")) {
              startReset(async () => {
                await resetSettingAction(settingKey);
                router.refresh();
                // tải lại để các ô nhập lấy lại giá trị mặc định
                window.location.reload();
              });
            }
          }}
        >
          Khôi phục mặc định
        </button>
      )}
      <StatusText status={status} />
    </div>
  );
}

/** Danh sách chuỗi chỉnh sửa được (thêm / xóa từng dòng). */
export function StringListEditor({
  values,
  onChange,
  placeholder,
  max = 50,
  addLabel = "Thêm",
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  max?: number;
  addLabel?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || values.includes(v) || values.length >= max) return;
    onChange([...values, v]);
    setDraft("");
  };
  return (
    <div>
      {values.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {values.map((v) => (
            <li key={v} className="flex items-center gap-1 rounded-full bg-surface-2 py-1 pl-3 pr-1 text-sm">
              {v}
              <button
                type="button"
                aria-label={`Xóa "${v}"`}
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="flex size-6 items-center justify-center rounded-full text-muted hover:bg-danger-soft hover:text-danger"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-2xl border border-line bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand"
        />
        <button type="button" onClick={add} className={btn.secondary}>
          {addLabel}
        </button>
      </div>
    </div>
  );
}

export function Section({ title, description, children, className }: { title: string; description?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:p-6", className)}>
      <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const textarea =
  "w-full rounded-2xl border border-line bg-surface px-4 py-3 font-mono text-sm leading-relaxed text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15";
