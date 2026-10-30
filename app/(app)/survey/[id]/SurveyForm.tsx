"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitSurvey } from "@/app/actions/student-extras";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import type { SurveyAnswers, SurveyQuestion } from "@/lib/surveys";

export function SurveyForm({ surveyId, questions }: { surveyId: string; questions: SurveyQuestion[] }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const set = (id: string, value: string | number) => setAnswers((a) => ({ ...a, [id]: value }));

  if (done) {
    return <p className="mt-6 rounded-3xl bg-mint p-6 text-center font-semibold">🎉 Đã gửi. Cảm ơn bạn đã giúp nhóm hiểu học sinh hơn!</p>;
  }

  return (
    <form
      action={() =>
        startTransition(async () => {
          setError(null);
          const res = await submitSurvey(surveyId, answers);
          if (res.ok) {
            setDone(true);
            router.refresh();
          } else setError(res.error);
        })
      }
      className="mt-6 space-y-4"
    >
      {questions.map((q, i) => (
        <fieldset key={q.id} className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <legend className="sr-only">{q.text}</legend>
          <p className="font-semibold">
            <span className="text-muted">{i + 1}. </span>
            {q.text}
            {!q.required && <span className="ml-1 text-xs font-normal text-muted">(không bắt buộc)</span>}
          </p>

          {q.type === "scale" && (
            <div className="mt-3">
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={answers[q.id] === n}
                    onClick={() => set(q.id, n)}
                    className={cn(
                      "rounded-2xl border-2 py-3 text-lg font-bold transition",
                      answers[q.id] === n ? "border-brand bg-brand-soft" : "border-line hover:bg-surface-2",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {(q.minLabel || q.maxLabel) && (
                <div className="mt-1 flex justify-between text-xs text-muted">
                  <span>{q.minLabel}</span>
                  <span>{q.maxLabel}</span>
                </div>
              )}
            </div>
          )}

          {q.type === "choice" && (
            <div className="mt-3 space-y-2">
              {q.options.map((opt) => (
                <label
                  key={opt}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 transition",
                    answers[q.id] === opt ? "border-brand bg-brand-soft" : "border-line hover:bg-surface-2",
                  )}
                >
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id] === opt}
                    onChange={() => set(q.id, opt)}
                    className="accent-[var(--brand)]"
                  />
                  {opt}
                </label>
              ))}
            </div>
          )}

          {q.type === "text" && (
            <textarea
              value={String(answers[q.id] ?? "")}
              onChange={(e) => set(q.id, e.target.value)}
              rows={3}
              maxLength={1000}
              aria-label={q.text}
              className="mt-3 w-full resize-none rounded-2xl border border-line bg-surface px-4 py-3 outline-none focus:border-brand"
            />
          )}
        </fieldset>
      ))}

      {questions.some((q) => q.type === "text") && (
        <p className="text-xs text-muted">
          Thầy cô chỉ xem kết quả chung của cả lớp. Riêng khi câu bạn tự viết có dấu hiệu bạn đang gặp nguy hiểm, phòng
          tham vấn sẽ được báo, chỉ kèm đúng câu đó, để kịp hỗ trợ bạn.
        </p>
      )}
      {error && <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
      <button type="submit" disabled={pending} className={cn(btn.primary, "w-full py-4")}>
        {pending ? "Đang gửi…" : "Gửi câu trả lời"}
      </button>
    </form>
  );
}
