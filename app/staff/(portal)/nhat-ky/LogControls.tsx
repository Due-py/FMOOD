"use client";

import { useState, useTransition } from "react";
import { lookupStudentName, setStudentLogging } from "@/app/actions/activity";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

/** Công tắc ghi hoạt động học sinh (cài đặt "log.students"). */
export function LogSwitch({ enabled, inWindow }: { enabled: boolean; inWindow: boolean }) {
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
            const res = await setStudentLogging(!on);
            if (res.ok) setOn(!on);
            else setError("Chưa lưu được. Thử lại nhé.");
          })
        }
        className={cn(
          "relative h-8 w-14 shrink-0 rounded-full transition disabled:opacity-50",
          on ? "bg-[var(--series-pos)]" : "bg-surface-2 ring-1 ring-line",
        )}
      >
        <span className={cn("absolute top-1 size-6 rounded-full bg-white shadow transition-all", on ? "left-7" : "left-1")} />
        <span className="sr-only">Ghi hoạt động học sinh</span>
      </button>
      <span className="text-sm font-semibold">
        {on ? (inWindow ? "Đang ghi" : "Đang bật, nhưng ngoài đợt thử nên máy chủ không ghi") : "Đã tắt, không ghi"}
      </span>
      {error && <span className="text-sm text-danger">{error}</span>}
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
