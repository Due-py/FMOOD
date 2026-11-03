"use client";

import { useState, useTransition } from "react";
import { clearStudentLog, lookupStudentName, setStudentLogging, setStudentTextLogging } from "@/app/actions/activity";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

/** Công tắc bật / tắt một cài đặt của nhật ký học sinh; `danger` tô đỏ khi đang bật. */
function Toggle({ enabled, save, label, onText, offText, danger }: { enabled: boolean; save: (on: boolean) => Promise<{ ok: boolean }>; label: string; onText: string; offText: string; danger?: boolean }) {
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
            const res = await save(!on);
            if (res.ok) setOn(!on);
            else setError("Chưa lưu được. Thử lại nhé.");
          })
        }
        className={cn(
          "relative h-8 w-14 shrink-0 rounded-full transition disabled:opacity-50",
          on ? (danger ? "bg-danger" : "bg-[var(--series-pos)]") : "bg-surface-2 ring-1 ring-line",
        )}
      >
        <span className={cn("absolute top-1 size-6 rounded-full bg-white shadow transition-all", on ? "left-7" : "left-1")} />
        <span className="sr-only">{label}</span>
      </button>
      <span className={cn("text-sm font-semibold", on && danger && "text-danger")}>{on ? onText : offText}</span>
      {error && <span className="text-sm text-danger">{error}</span>}
    </div>
  );
}

/** Công tắc ghi hoạt động học sinh (cài đặt "log.students"). */
export function LogSwitch({ enabled }: { enabled: boolean }) {
  return <Toggle enabled={enabled} save={setStudentLogging} label="Ghi hoạt động học sinh" onText="Đang ghi" offText="Đã tắt" />;
}

/** Công tắc ghi cả lời học sinh viết và tâm trạng (log.students.text). Duy 03/11: chỉ bật khi tự thử. */
export function TextLogSwitch({ enabled }: { enabled: boolean }) {
  return (
    <Toggle
      enabled={enabled}
      save={setStudentTextLogging}
      label="Ghi cả lời học sinh viết và tâm trạng"
      onText="Đang ghi lời học sinh viết và tâm trạng"
      offText="Không ghi lời (mặc định)"
      danger
    />
  );
}

/** Nút xóa toàn bộ nhật ký học sinh, có bước xác nhận. */
export function ClearLogButton({ total }: { total: number }) {
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!confirm)
    return (
      <button type="button" disabled={total === 0} onClick={() => setConfirm(true)} className={btn.secondary}>
        Xóa toàn bộ
      </button>
    );
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-semibold">Xóa hết {total} dòng? Không khôi phục được.</span>
      <button
        type="button"
        disabled={pending}
        className={btn.danger}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await clearStudentLog();
            if (res.ok) setConfirm(false);
            else setError("Chưa xóa được. Thử lại nhé.");
          })
        }
      >
        Xóa hết
      </button>
      <button type="button" onClick={() => setConfirm(false)} className={btn.ghost}>
        Thôi
      </button>
      {error && <span className="text-danger">{error}</span>}
    </div>
  );
}

/** Tra tên một mã học sinh. Mỗi lần tra đều được ghi vào nhật ký thầy cô. */
export function NameLookup({ code }: { code: string }) {
  const [step, setStep] = useState<"idle" | "confirm">("idle");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (result) return <p className="rounded-2xl bg-butter px-4 py-3 text-sm font-semibold">{result}</p>;
  if (step === "idle")
    return (
      <button type="button" onClick={() => setStep("confirm")} className={btn.secondary}>
        🔎 Tra tên mã này
      </button>
    );
  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-4 text-sm">
      <p>
        Chỉ tra tên khi thật cần (ví dụ giúp em đăng nhập). Lần tra này sẽ được <strong>ghi vào nhật ký</strong> với tên của thầy cô.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          className={btn.primary}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await lookupStudentName(code);
              if (res.ok) setResult(`${code}: ${res.nickname}${res.fullName ? ` (${res.fullName})` : ""}${res.className ? ` · lớp ${res.className}` : ""}`);
              else setError(res.error);
            })
          }
        >
          Tra tên
        </button>
        <button type="button" onClick={() => setStep("idle")} className={btn.ghost}>
          Thôi
        </button>
      </div>
      {error && <p className="mt-2 text-danger">{error}</p>}
    </div>
  );
}
