"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveScore } from "@/app/actions/bai-do";
import {
  CELL_ANCHORS,
  CELL_IDS,
  CELL_LABEL,
  CELL_VALUES,
  GUESS_CLASS_OPTIONS,
  GUESS_ROUND_OPTIONS,
  SITUATION_SKILL,
  TEST_TEXT_QUESTIONS,
  type CellValue,
  type Cells,
} from "@/lib/bai-do";
import type { RaterScore } from "@/lib/bai-do";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

const SITUATIONS = [1, 2, 3, 4] as const;
const VALUE_HINT: Record<string, string> = { T: "trống", K: "không muốn trả lời" };

/** Chấm một bài: từng tình huống hiện câu trả lời và 3 ô điểm cạnh nhau, có mốc chấm rút gọn. */
export function ScoreForm({
  code,
  answers,
  initial,
  locked,
  prevCode,
  nextCode,
}: {
  code: string;
  answers: { id: string; answer: string }[];
  initial: RaterScore | null;
  locked: boolean;
  prevCode: string | null;
  nextCode: string | null;
}) {
  const router = useRouter();
  const [cells, setCells] = useState<Cells>(initial?.cells ?? {});
  const [guessClass, setGuessClass] = useState(initial?.guess_class ?? "");
  const [guessRound, setGuessRound] = useState(initial?.guess_round ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [referred, setReferred] = useState(initial?.referred ?? false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const filled = CELL_IDS.filter((c) => cells[c] !== undefined).length;

  function save(goNext: boolean) {
    setStatus(null);
    startTransition(async () => {
      const res = await saveScore(code, { cells, guess_class: guessClass || null, guess_round: guessRound || null, note: note || null, referred });
      if (!res.ok) return setStatus({ ok: false, text: res.error });
      setStatus({ ok: true, text: "Đã lưu." });
      if (goNext && nextCode) router.push(`/staff/cham-bai/${nextCode}`);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {SITUATIONS.map((n) => (
        <section key={n} className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <h2 className="font-display text-lg font-bold tracking-tight">{SITUATION_SKILL[n]}</h2>
          <div className="mt-3 space-y-3">
            {TEST_TEXT_QUESTIONS.filter((q) => q.situation === n).map((q) => {
              const a = answers.find((x) => x.id === q.id)?.answer ?? "";
              return (
                <div key={q.id}>
                  <p className="text-sm font-semibold text-muted">
                    {q.id}. {q.label}
                  </p>
                  <p className={cn("mt-1 whitespace-pre-wrap rounded-2xl px-4 py-2.5", a ? "bg-surface-2" : "bg-surface-2/50 italic text-muted")}>
                    {a || "(bỏ trống)"}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 space-y-3 border-t border-line pt-4">
            {CELL_IDS.filter((c) => c.startsWith(`${n}.`)).map((c) => (
              <div key={c} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
                <div>
                  <p className="font-semibold">
                    {c} {CELL_LABEL[c]}
                  </p>
                  <ul className="mt-1 space-y-0.5 text-xs text-muted">
                    <li>
                      <strong>2:</strong> {CELL_ANCHORS[c].two}
                    </li>
                    <li>
                      <strong>1:</strong> {CELL_ANCHORS[c].one}
                    </li>
                    <li>
                      <strong>0:</strong> {CELL_ANCHORS[c].zero}
                    </li>
                  </ul>
                </div>
                <div role="radiogroup" aria-label={`Ô ${c}`} className="flex gap-1.5">
                  {CELL_VALUES.map((v) => (
                    <button
                      key={String(v)}
                      type="button"
                      role="radio"
                      aria-checked={cells[c] === v}
                      title={VALUE_HINT[String(v)]}
                      disabled={locked}
                      onClick={() => setCells((cur) => ({ ...cur, [c]: v as CellValue }))}
                      className={cn(
                        "size-11 rounded-2xl border-2 text-base font-bold transition",
                        cells[c] === v ? "border-brand bg-brand-soft" : "border-line hover:bg-surface-2",
                      )}
                    >
                      {String(v)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Thầy cô đoán bài này của lớp nào?</span>
            <select value={guessClass} onChange={(e) => setGuessClass(e.target.value)} disabled={locked} className={input}>
              <option value="">(chưa chọn)</option>
              {GUESS_CLASS_OPTIONS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Đoán bài làm ở lần nào?</span>
            <select value={guessRound} onChange={(e) => setGuessRound(e.target.value)} disabled={locked} className={input}>
              <option value="">(chưa chọn)</option>
              {GUESS_ROUND_OPTIONS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-semibold">Ghi chú (câu chưa có trong bảng mẫu)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} disabled={locked} className={input} />
          <span className="mt-1 block text-xs text-muted">Không chép nội dung bài của học sinh vào đây.</span>
        </label>
        <label className="mt-4 flex items-start gap-3 rounded-2xl bg-peach px-4 py-3 text-sm">
          <input type="checkbox" checked={referred} onChange={(e) => setReferred(e.target.checked)} disabled={locked} className="mt-1 accent-[var(--brand)]" />
          <span>
            <strong>Bài có điều đáng lo</strong> (ví dụ ý muốn làm hại bản thân, sợ bị đánh): dừng chấm ô đó. Khi lưu, tư vấn viên của trường
            được báo để tìm gặp học sinh; cảnh báo không kèm mã bài hay nội dung bài. Không tìm cách đoán đó là bạn nào.
          </span>
        </label>
      </section>

      <div className="sticky bottom-3 flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] border border-line bg-surface/95 p-3 backdrop-blur">
        <span className="mr-auto text-sm text-muted">{filled}/12 ô</span>
        {prevCode && (
          <Link href={`/staff/cham-bai/${prevCode}`} className={btn.ghost}>
            ← {prevCode}
          </Link>
        )}
        {!locked && (
          <>
            <button type="button" disabled={pending} className={btn.secondary} onClick={() => save(false)}>
              Lưu
            </button>
            {nextCode && (
              <button type="button" disabled={pending} className={btn.primary} onClick={() => save(true)}>
                Lưu, sang {nextCode} →
              </button>
            )}
          </>
        )}
        {status && (
          <p role={status.ok ? "status" : "alert"} className={cn("w-full text-sm", status.ok ? "text-brand-strong dark:text-brand" : "text-danger")}>
            {status.text}
          </p>
        )}
      </div>
    </div>
  );
}
