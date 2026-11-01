"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { startPractice } from "@/app/actions/practice";
import { roleplayOf } from "@/lib/practice/roleplay";
import { LIMITS } from "@/lib/practice/shared";
import type { SkillId } from "@/lib/skills";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { CrisisNotice, type SupportCards } from "../CrisisNotice";

type CaseItem = { code: string; sign: string; title: string | null; situation: string };
type From = "chat" | "library" | "journal" | "checkin" | "skills" | "home";

/**
 * Chọn tình huống để mở bài luyện (kế hoạch V2 mục 2.4, phản hồi II.2):
 * "Thử với tình huống mẫu" lên trước và dễ bấm nhất; "Dùng tình huống của mình" là tự nguyện, không cần kể chuyện riêng.
 * Vào từ trò chuyện: ô tình huống riêng để TRỐNG (không chép lời chat, không điền sẵn điều gì).
 */
export function SkillStart({ skill, cases, from, supportCards }: { skill: SkillId; cases: CaseItem[]; from: From; supportCards: SupportCards }) {
  const router = useRouter();
  const [own, setOwn] = useState("");
  const [showOwn, setShowOwn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crisis, setCrisis] = useState<{ text: string; notified: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const [picked, setPicked] = useState<string | null>(null);

  function start(choice: { caseCode?: string; ownSituation?: string }) {
    setError(null);
    setPicked(choice.caseCode ?? "own");
    startTransition(async () => {
      const res = await startPractice({ subskill: skill, from, ...choice });
      if (res.ok) router.push(`/luyen/bai/${res.id}`);
      else if ("crisis" in res) setCrisis(res.crisis);
      else setError(res.error);
    });
  }

  if (crisis) return <CrisisNotice text={crisis.text} notified={crisis.notified} cards={supportCards} />;

  return (
    <div className="space-y-5">
      {error && (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
      {from === "chat" && (
        <p className="rounded-2xl bg-sky px-4 py-3 text-sm text-sky-ink">
          Bạn đến từ cuộc trò chuyện. Lời chat không được chép vào bài luyện; bạn chọn tình huống ở dưới.
        </p>
      )}

      <section aria-labelledby="tinh-huong-mau">
        <h2 id="tinh-huong-mau" className="font-display text-lg font-bold tracking-tight">
          Thử với tình huống mẫu
        </h2>
        <p className="mt-1 text-sm text-muted">Luyện với chuyện của một bạn khác, không cần kể chuyện riêng.</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {cases.map((c) => (
            <li key={c.code}>
              <button
                type="button"
                disabled={pending}
                onClick={() => start({ caseCode: c.code })}
                className="flex h-full min-h-16 w-full flex-col rounded-[var(--radius-card)] border border-line bg-surface p-4 text-left transition hover:-translate-y-0.5 hover:border-brand-edge disabled:opacity-60"
              >
                {/* thẻ có tên (tình huống Duy soạn): tên đậm, chữ tình huống nhỏ hơn; không có tên: nhãn biểu hiện */}
                {c.title ? (
                  <>
                    <span className="font-display font-bold leading-tight">{c.title}</span>
                    <span className="mt-1 text-sm leading-relaxed text-muted">{c.situation}</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted">{c.sign}</span>
                    <span className="mt-1 font-medium">{c.situation}</span>
                  </>
                )}
                {pending && picked === c.code && <span className="mt-2 text-sm text-muted">Đang mở…</span>}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="cua-minh" className="rounded-[var(--radius-card)] border border-dashed border-line bg-surface/60 p-4">
        <h2 id="cua-minh" className="font-semibold">
          Dùng tình huống của mình (tùy bạn)
        </h2>
        <p className="mt-1 text-sm text-muted">Không cần kể chuyện riêng. Nếu muốn, viết ngắn một chuyện học tập đang làm bạn khó.</p>
        {/* vai bạn cùng lớp chỉ dùng tình huống mẫu (Duy quyết 01/11): nói trước để học sinh chọn */}
        {roleplayOf(skill)?.kind === "peer" && (
          <p className="mt-1 text-sm text-muted">Phần tập nói với bạn trong vai chỉ có khi bạn chọn tình huống mẫu ở trên.</p>
        )}
        {showOwn ? (
          <>
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
            <button type="button" disabled={pending || own.trim().length < 4} onClick={() => start({ ownSituation: own })} className={cn(btn.primary, "mt-3")}>
              {pending && picked === "own" ? "Đang mở…" : "Luyện với tình huống này"}
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setShowOwn(true)} className={cn(btn.secondary, "mt-3")}>
            Viết tình huống của mình
          </button>
        )}
      </section>
    </div>
  );
}
