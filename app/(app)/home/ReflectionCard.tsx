"use client";

import { useState, useTransition } from "react";
import { answerReflection } from "@/app/actions/student-extras";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

/** Câu hỏi suy ngẫm hôm nay. Câu trả lời là riêng tư của học sinh. */
export function ReflectionCard({ question, answer }: { question: string; answer: string | null }) {
  const [editing, setEditing] = useState(!answer);
  const [text, setText] = useState(answer ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section className="rounded-[var(--radius-card)] bg-lilac p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Câu hỏi suy ngẫm hôm nay</p>
      <h2 className="mt-1 font-display text-lg font-bold leading-snug tracking-tight">{question}</h2>

      {editing ? (
        <form
          action={() =>
            startTransition(async () => {
              setError(null);
              const res = await answerReflection(text);
              if (res.ok) setEditing(false);
              else setError(res.error);
            })
          }
          className="mt-3"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Viết ra suy nghĩ của bạn… (chỉ mình bạn đọc được)"
            aria-label="Câu trả lời của bạn"
            className="w-full resize-none rounded-2xl border border-line bg-surface/80 px-4 py-3 outline-none focus:border-brand"
          />
          {error && <p role="alert" className="mt-1 text-sm text-danger">{error}</p>}
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-xs text-muted">🔒 Riêng tư, thầy cô không đọc được</span>
            <button type="submit" disabled={pending || !text.trim()} className={cn(btn.primary, "px-5 py-2")}>
              {pending ? "Đang lưu…" : "Lưu"}
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-3">
          <p className="whitespace-pre-wrap rounded-2xl bg-surface/70 px-4 py-3">{text}</p>
          <button type="button" onClick={() => setEditing(true)} className="mt-2 text-sm font-semibold text-muted hover:text-ink">
            Sửa câu trả lời
          </button>
        </div>
      )}
    </section>
  );
}
