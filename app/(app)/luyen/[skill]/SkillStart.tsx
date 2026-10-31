"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { startPractice } from "@/app/actions/practice";
import { LIMITS } from "@/lib/practice/shared";
import type { SkillCode } from "@/lib/skills";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { CrisisNotice, type SupportCards } from "../CrisisNotice";

type CaseItem = { code: string; sign: string; situation: string };

/** Chọn "tình huống của mình" hoặc một tình huống mẫu, rồi mở bài luyện. */
export function SkillStart({ skill, cases, prefill, supportCards }: { skill: SkillCode; cases: CaseItem[]; prefill: string | null; supportCards: SupportCards }) {
  const router = useRouter();
  const [own, setOwn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [crisis, setCrisis] = useState<{ text: string; notified: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const [picked, setPicked] = useState<string | null>(null);

  function start(choice: { caseCode?: string; ownSituation?: string }) {
    setError(null);
    setPicked(choice.caseCode ?? "own");
    startTransition(async () => {
      const res = await startPractice({ skill, ...choice });
      if (res.ok) router.push(`/luyen/bai/${res.id}`);
      else if ("crisis" in res) setCrisis(res.crisis);
      else setError(res.error);
    });
  }

  if (crisis) return <CrisisNotice text={crisis.text} notified={crisis.notified} cards={supportCards} />;

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
      <section aria-labelledby="cua-minh" className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <h2 id="cua-minh" className="font-display text-lg font-bold tracking-tight">
          Tình huống của mình
        </h2>
        <p className="mt-1 text-sm text-muted">Kể ngắn một chuyện học tập đang làm bạn khó, hoặc một việc sắp tới bạn muốn chuẩn bị trước.</p>
        {prefill && !own && (
          <button
            type="button"
            onClick={() => setOwn(prefill)}
            className="mt-3 w-full rounded-2xl border border-dashed border-brand/50 bg-brand-soft px-4 py-3 text-left text-sm transition hover:border-brand"
          >
            <span className="block text-xs font-semibold uppercase tracking-wide text-muted">Dùng điều bạn đã xác nhận gần đây</span>
            <span className="block font-medium">“{prefill}”</span>
          </button>
        )}
        <label htmlFor="own-situation" className="sr-only">
          Tình huống của mình
        </label>
        <textarea
          id="own-situation"
          value={own}
          onChange={(e) => setOwn(e.target.value)}
          maxLength={LIMITS.situation}
          rows={3}
          placeholder="Ví dụ: thứ Sáu kiểm tra Lý mà mình còn 2 bài chưa hiểu"
          className={cn(input, "mt-3 resize-y")}
        />
        <button
          type="button"
          disabled={pending || own.trim().length < 4}
          onClick={() => start({ ownSituation: own })}
          className={cn(btn.primary, "mt-3")}
        >
          {pending && picked === "own" ? "Đang mở…" : "Luyện với tình huống này"}
        </button>
      </section>

      <section aria-labelledby="tinh-huong-mau">
        <h2 id="tinh-huong-mau" className="font-display text-lg font-bold tracking-tight">
          Hoặc chọn một tình huống mẫu
        </h2>
        <p className="mt-1 text-sm text-muted">Không muốn kể chuyện riêng cũng được, luyện với chuyện của một bạn khác.</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {cases.map((c) => (
            <li key={c.code}>
              <button
                type="button"
                disabled={pending}
                onClick={() => start({ caseCode: c.code })}
                className="flex h-full w-full flex-col rounded-[var(--radius-card)] border border-line bg-surface p-4 text-left transition hover:-translate-y-0.5 hover:border-ink/25 disabled:opacity-60"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">{c.sign}</span>
                <span className="mt-1 font-medium">{c.situation}</span>
                {pending && picked === c.code && <span className="mt-2 text-sm text-muted">Đang mở…</span>}
              </button>
            </li>
          ))}
        </ul>
      </section>

    </div>
  );
}
