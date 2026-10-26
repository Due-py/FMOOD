"use client";

import { useState, useTransition } from "react";
import { runProof } from "@/app/actions/demo";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import type { ProofResult } from "@/lib/demo/privacy";

/** Nút chạy kiểm tra tách dữ liệu THẬT (đăng nhập bằng bạn A, gọi thẳng cơ sở dữ liệu). */
export function ProofRunner() {
  const [result, setResult] = useState<ProofResult | null>(null);
  const [pending, start] = useTransition();
  const ok = result?.ok ? result : null;
  const groups = ok ? [...new Set(ok.rows.map((r) => r.group))] : [];
  const blocked = ok ? ok.rows.filter((r) => r.blocked).length : 0;

  return (
    <div className="space-y-4">
      <button type="button" disabled={pending} onClick={() => start(async () => setResult(await runProof()))} className={cn(btn.primary, "text-lg")}>
        {pending ? "Đang đăng nhập bằng bạn A và thử…" : "🔓 Chạy kiểm tra thật"}
      </button>
      {result && !result.ok && (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {result.error}
        </p>
      )}
      {ok && (
        <div className="space-y-4" aria-live="polite">
          <div className={cn("rounded-[var(--radius-card)] p-5", blocked === ok.rows.length ? "bg-mint" : "bg-danger-soft")}>
            <p className="font-display text-4xl font-extrabold tabular-nums">
              {blocked}/{ok.rows.length} lần bị chặn
            </p>
            <p className="mt-1 text-sm">
              Chạy lúc vừa rồi, mất {(ok.ms / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} giây. Đối chứng: {ok.a} đọc được hồ sơ của chính mình (
              {ok.control.ownProfile} dòng) và {ok.control.ownCheckins} lần check-in của mình; {ok.b} thật sự có {ok.control.bCheckins} lần check-in,{" "}
              {ok.control.bWorries} chuyện bận lòng, {ok.control.bMessages} tin nhắn. Nên “0 dòng” là bị chặn thật, không phải do không có gì.
            </p>
          </div>
          {groups.map((g) => (
            <div key={g}>
              <p className="mb-2 font-display text-lg font-bold">{g}</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {ok.rows
                  .filter((r) => r.group === g)
                  .map((r) => (
                    <li key={r.attempt} className="flex items-start gap-3 rounded-2xl bg-surface-2 px-4 py-2.5 text-sm">
                      <span aria-hidden>{r.blocked ? "✅" : "❌"}</span>
                      <span className="min-w-0 flex-1">
                        <span className="font-semibold">{r.attempt}</span>
                        <span className="block text-muted">{r.blocked ? `Chặn được · ${r.detail}` : `LỌT · ${r.detail}`}</span>
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
