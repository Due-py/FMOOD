"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import Markdown from "react-markdown";
import { runSimulation } from "@/app/actions/demo";
import { CharacterAvatar } from "@/components/mascot/CharacterAvatar";
import { cn } from "@/components/ui/cn";
import type { SimKind, SimResult } from "@/lib/demo/simulate";

type Case = { kind: SimKind; title: string; emoji: string; message: string; real: boolean; note: string };

const TONE: Record<SimResult["steps"][number]["tone"], string> = {
  ok: "bg-mint",
  watch: "bg-butter",
  urgent: "bg-danger text-white",
  info: "bg-sky",
};

export function SimulationBoard({ cases, demo }: { cases: Case[]; demo: boolean }) {
  const [active, setActive] = useState<SimKind | null>(null);
  const [result, setResult] = useState<SimResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(kind: SimKind) {
    setActive(kind);
    setResult(null);
    setError(null);
    start(async () => {
      const res = await runSimulation(kind);
      if (res.ok) setResult(res.result);
      else setError(res.error);
    });
  }

  const current = cases.find((c) => c.kind === active);
  return (
    <div className="space-y-6">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cases.map((c) => (
          <li key={c.kind}>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(c.kind)}
              aria-pressed={active === c.kind}
              className={cn(
                "flex h-full w-full flex-col rounded-[var(--radius-card)] p-4 text-left transition hover:-translate-y-1 disabled:opacity-60",
                active === c.kind ? "bg-ink text-surface" : c.kind === "khan-cap" ? "bg-peach" : c.real ? "bg-mint" : "bg-surface-2",
              )}
            >
              <span className="text-3xl" aria-hidden>
                {c.emoji}
              </span>
              <span className="mt-3 font-display text-lg font-bold leading-tight">{c.title}</span>
              <span className={cn("mt-1 text-xs", active === c.kind ? "text-surface/70" : "text-muted")}>{c.real ? "Chạy thật" : "Giả lập"}</span>
            </button>
          </li>
        ))}
      </ul>

      {current && (
        <section aria-live="polite" className="space-y-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="max-w-[85%] rounded-3xl rounded-br-md bg-ink px-4 py-3 text-surface">{current.message}</div>
            <p className="text-xs text-muted">{current.note}</p>
          </div>

          {pending && <p className="text-sm text-muted">Đang chạy…</p>}
          {error && (
            <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
              {error}
            </p>
          )}

          {result && (
            <>
              <ol className="grid gap-3 md:grid-cols-3">
                {result.steps.map((s, i) => (
                  <li key={s.title} className={cn("rounded-[var(--radius-card)] p-4", TONE[s.tone])}>
                    <p className="font-display text-sm font-extrabold opacity-60">Bước {i + 1}</p>
                    <p className="font-display text-lg font-bold leading-tight">{s.title}</p>
                    <p className="mt-1 text-sm leading-snug">{s.detail}</p>
                  </li>
                ))}
              </ol>

              {result.reply && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted">{result.reply.note}</p>
                  <div className="flex items-end gap-2">
                    <CharacterAvatar size={44} float={false} mood={result.reply.kind === "crisis" ? "caring" : "happy"} />
                    <div
                      className={cn(
                        "max-w-[90%] whitespace-pre-line rounded-3xl rounded-bl-md px-4 py-3 leading-relaxed [&_p+p]:mt-2",
                        result.reply.kind === "gentle" ? "bg-butter font-mono text-sm" : "bg-surface ring-1 ring-line",
                      )}
                    >
                      {result.reply.kind === "gentle" ? result.reply.text : <Markdown>{result.reply.text}</Markdown>}
                    </div>
                  </div>
                  {result.reply.kind !== "normal" && result.hotlines.length > 0 && (
                    <ul className="ml-12 flex flex-wrap gap-2 text-sm">
                      {result.hotlines.map((h) => (
                        <li key={h.name} className="rounded-full bg-danger-soft px-3 py-1.5">
                          📞 <strong>{h.name}</strong> {h.detail}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {result.alert && (
                <div className="space-y-3">
                  <h2 className="font-display text-2xl font-bold tracking-tight">Cảnh báo này đến tay ai, và họ thấy gì?</h2>
                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className="rounded-[var(--radius-card)] bg-lilac p-4">
                      <p className="font-display text-lg font-bold">Tư vấn viên thấy</p>
                      <p className="text-xs text-muted">để xử lý</p>
                      <p className="mt-2 rounded-2xl bg-surface/80 px-3 py-2 text-sm">{result.alert.counselorSees.excerpt ?? "(không có đoạn trích)"}</p>
                      {result.alert.counselorSees.reasons.length > 0 && <p className="mt-2 text-sm">Lý do: {result.alert.counselorSees.reasons.join(" · ")}</p>}
                    </div>
                    <div className="rounded-[var(--radius-card)] bg-sky p-4">
                      <p className="font-display text-lg font-bold">GVCN thấy</p>
                      <p className="text-xs text-muted">biết để quan tâm, không đọc nội dung</p>
                      <p className="mt-2 rounded-2xl bg-surface/80 px-3 py-2 text-sm">
                        {result.alert.teacherSees.hidden ? "🔒 Có cảnh báo về bạn này. Nội dung chỉ phòng tham vấn đọc được." : result.alert.teacherSees.excerpt}
                      </p>
                    </div>
                    <div className="rounded-[var(--radius-card)] border-2 border-dashed border-ink/20 p-4">
                      <p className="font-display text-lg font-bold">Email</p>
                      {result.alert.email ? (
                        <>
                          <p className="text-xs text-muted">Gửi tới: {result.alert.email.to.join(", ") || "thầy cô phụ trách"} · KHÔNG gửi vì đang trình diễn</p>
                          <p className="mt-2 text-sm font-semibold">{result.alert.email.subject}</p>
                          <pre className="mt-1 whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted">{result.alert.email.text}</pre>
                        </>
                      ) : (
                        <p className="mt-2 text-sm">Không gửi email (chỉ gửi khi khẩn cấp, khi bạn tự nhờ giúp, hoặc thấy nặng hơn lúc được hỏi lại).</p>
                      )}
                    </div>
                  </div>
                  {result.alert.saved ? (
                    <p className="flex flex-wrap items-center gap-3 rounded-2xl bg-mint px-4 py-3 text-sm">
                      Cảnh báo mẫu vừa vào hộp của tư vấn viên (lớp mẫu).
                      <Link href="/staff/alerts" className="rounded-full bg-surface px-3 py-1.5 font-semibold">
                        Mở hộp Cảnh báo
                      </Link>
                    </p>
                  ) : (
                    !demo && <p className="text-sm text-muted">Bật chế độ trình diễn để cảnh báo mẫu hiện luôn trong hộp Cảnh báo.</p>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
