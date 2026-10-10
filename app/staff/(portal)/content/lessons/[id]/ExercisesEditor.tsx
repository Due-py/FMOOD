"use client";

import { cn } from "@/components/ui/cn";
import { input } from "@/components/ui/styles";
import { EXERCISE_TYPE_LABEL, type Exercise } from "@/lib/exercises";

/** Soạn 0–5 bài tập cho một bài học. */
export function ExercisesEditor({ value, onChange }: { value: Exercise[]; onChange: (v: Exercise[]) => void }) {
  const update = (i: number, patch: Partial<Exercise>) => onChange(value.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const renumber = (list: Exercise[]) => list.map((e, i) => ({ ...e, id: `e${i + 1}` }));

  return (
    <div className="space-y-3">
      {value.map((ex, i) => {
        const hasOptions = ex.type === "choice" || ex.type === "multi";
        const answers = Array.isArray(ex.answer) ? ex.answer : ex.answer ? [ex.answer] : [];
        return (
          <div key={i} className="rounded-2xl border border-line bg-surface-2 p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand-strong dark:text-brand">Bài tập {i + 1}</span>
              <select
                value={ex.type}
                onChange={(e) => update(i, { type: e.target.value as Exercise["type"], answer: undefined })}
                aria-label="Dạng bài tập"
                className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold"
              >
                {Object.entries(EXERCISE_TYPE_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => onChange(renumber(value.filter((_, j) => j !== i)))} className="ml-auto text-xs font-semibold text-danger hover:underline">
                Xóa bài tập
              </button>
            </div>
            <textarea value={ex.prompt} onChange={(e) => update(i, { prompt: e.target.value })} rows={2} placeholder="Câu hỏi / yêu cầu" aria-label="Câu hỏi" className={input} />

            {hasOptions && (
              <div className="mt-2 space-y-1.5">
                <p className="text-xs text-muted">Lựa chọn. Đánh dấu ✓ đáp án đúng nếu là câu kiểm tra kiến thức (bỏ trống nếu là câu hỏi ý kiến).</p>
                {ex.options.map((o, k) => (
                  <div key={k} className="flex items-center gap-2">
                    <input
                      type={ex.type === "choice" ? "radio" : "checkbox"}
                      checked={answers.includes(o) && o !== ""}
                      aria-label="Đáp án đúng"
                      onChange={(e) => {
                        if (ex.type === "choice") update(i, { answer: e.target.checked ? o : undefined });
                        else {
                          const next = e.target.checked ? [...answers, o] : answers.filter((a) => a !== o);
                          update(i, { answer: next.length ? next : undefined });
                        }
                      }}
                      className="accent-[var(--brand)]"
                    />
                    <input
                      value={o}
                      onChange={(e) => {
                        const options = ex.options.map((x, m) => (m === k ? e.target.value : x));
                        const fix = (a: string) => (a === o ? e.target.value : a);
                        update(i, {
                          options,
                          answer: Array.isArray(ex.answer) ? ex.answer.map(fix) : ex.answer ? fix(ex.answer) : undefined,
                        });
                      }}
                      aria-label={`Lựa chọn ${k + 1}`}
                      className={cn(input, "py-2")}
                    />
                    <button type="button" aria-label="Xóa lựa chọn" onClick={() => update(i, { options: ex.options.filter((_, m) => m !== k), answer: undefined })} className="px-2 text-muted hover:text-danger">
                      ×
                    </button>
                  </div>
                ))}
                {ex.options.length < 8 && (
                  <button type="button" onClick={() => update(i, { options: [...ex.options, ""] })} className="text-xs font-semibold text-brand-strong hover:underline dark:text-brand">
                    + Thêm lựa chọn
                  </button>
                )}
              </div>
            )}

            {ex.type === "scale" && (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input value={ex.minLabel} onChange={(e) => update(i, { minLabel: e.target.value })} placeholder="Nhãn cho 1" aria-label="Nhãn cho 1" className={input} />
                <input value={ex.maxLabel} onChange={(e) => update(i, { maxLabel: e.target.value })} placeholder="Nhãn cho 5" aria-label="Nhãn cho 5" className={input} />
              </div>
            )}

            <input value={ex.hint} onChange={(e) => update(i, { hint: e.target.value })} placeholder="Gợi ý khi học sinh bấm “Mình cần giúp → Xem gợi ý”" aria-label="Gợi ý" className={cn(input, "mt-2 text-sm")} />
          </div>
        );
      })}
      {value.length < 5 && (
        <button
          type="button"
          onClick={() =>
            onChange(renumber([...value, { id: "e0", type: "text", prompt: "", options: [], minLabel: "", maxLabel: "", hint: "" }]))
          }
          className="rounded-full border border-dashed border-line px-4 py-2 text-sm font-semibold text-muted hover:border-brand hover:text-brand"
        >
          + Thêm bài tập
        </button>
      )}
    </div>
  );
}
