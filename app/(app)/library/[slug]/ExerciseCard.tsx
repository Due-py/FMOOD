"use client";

import Link from "next/link";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { submitExercise } from "@/app/actions/lessons";
import { btn } from "@/components/ui/styles";
import { useAssistant } from "@/components/mascot/AssistantContext";
import { cn } from "@/components/ui/cn";
import { clearDraft, draftKey, readDraft, writeDraft } from "@/lib/drafts";
import { EXERCISE_TYPE_LABEL, stableShuffle, type Exercise, type ExerciseAnswer } from "@/lib/exercises";

type Props = {
  userId: string;
  lessonId: string;
  lessonSlug: string;
  exercise: Exercise;
  index: number;
  saved: ExerciseAnswer | null;
  supportCard: ReactNode;
  /** thẻ có dòng "thầy cô đã được báo": chỉ hiện khi máy chủ xác nhận đã ghi cảnh báo */
  supportCardNotified: ReactNode;
  /** gọi khi lưu xong (để đếm bài đã làm) */
  onSaved: (exerciseId: string) => void;
};

/** Một bài tập: làm bài, xem gợi ý, hỏi trợ lý hoặc nhờ thầy cô. */
export function ExerciseCard({
  userId,
  lessonId,
  lessonSlug,
  exercise: ex,
  index,
  saved,
  supportCard,
  supportCardNotified,
  onSaved,
}: Props) {
  const [answer, setAnswer] = useState<ExerciseAnswer | null>(saved);
  const [submitted, setSubmitted] = useState(saved !== null);
  const [result, setResult] = useState<{ correct: boolean | null; risk: string; teacherNotified: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [pending, startTransition] = useTransition();
  // bài viết tự do: tự lưu nháp trên máy khi đang gõ
  const draft = ex.type === "text" ? draftKey(userId, lessonId, ex.id) : null;
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    if (!draft) return;
    const text = readDraft(draft);
    if (text !== null && text !== saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage chỉ đọc được sau khi trang đã hiện
      setAnswer(text);
      setHasDraft(true);
    }
  }, [draft, saved]);

  function submit() {
    if (answer === null) return setError("Bạn chưa trả lời.");
    setError(null);
    startTransition(async () => {
      const res = await submitExercise(lessonId, ex.id, answer);
      if (!res.ok) return setError(res.error);
      setSubmitted(true);
      setResult({ correct: res.correct, risk: res.risk, teacherNotified: res.teacherNotified });
      if (draft) clearDraft(draft);
      setHasDraft(false);
      onSaved(ex.id);
    });
  }

  const multi = Array.isArray(answer) ? answer : [];

  return (
    <section className="rounded-[var(--radius-card)] border-2 border-brand/30 bg-surface p-5">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
        <span className="rounded-full bg-brand-soft px-2.5 py-1 text-brand-strong dark:text-brand">Bài tập {index + 1}</span>
        <span className="text-muted">{EXERCISE_TYPE_LABEL[ex.type]}</span>
        {submitted && <span className="ml-auto text-brand-strong dark:text-brand">✓ Đã lưu</span>}
      </div>
      <p className="font-display text-lg font-bold leading-snug tracking-tight">{ex.prompt}</p>

      <div className="mt-4">
        {ex.type === "text" && (
          <textarea
            value={typeof answer === "string" ? answer : ""}
            onChange={(e) => {
              setAnswer(e.target.value);
              if (draft) {
                writeDraft(draft, e.target.value);
                setHasDraft(e.target.value.trim() !== "" && e.target.value !== saved);
              }
            }}
            rows={4}
            maxLength={1500}
            placeholder="Viết suy nghĩ của bạn… (chỉ mình bạn đọc được)"
            aria-label={ex.prompt}
            className="w-full resize-none rounded-2xl border border-line bg-surface px-4 py-3 outline-none focus:border-brand"
          />
        )}

        {(ex.type === "choice" || ex.type === "multi") && (
          <div className="space-y-2">
            {stableShuffle(ex.options, lessonId + ex.id).map((opt) => {
              const checked = ex.type === "choice" ? answer === opt : multi.includes(opt);
              const isRight = result?.correct !== null && result && ex.answer !== undefined && (Array.isArray(ex.answer) ? ex.answer.includes(opt) : ex.answer === opt);
              return (
                <label
                  key={opt}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-2xl border-2 px-4 py-3 transition",
                    checked ? "border-brand bg-brand-soft" : "border-line hover:bg-surface-2",
                    isRight && "ring-2 ring-[var(--series-pos)]",
                  )}
                >
                  <input
                    type={ex.type === "choice" ? "radio" : "checkbox"}
                    name={`${lessonId}-${ex.id}`}
                    checked={checked}
                    onChange={() =>
                      setAnswer(ex.type === "choice" ? opt : checked ? multi.filter((m) => m !== opt) : [...multi, opt])
                    }
                    className="mt-1 accent-[var(--brand)]"
                  />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
        )}

        {ex.type === "scale" && (
          <div>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={answer === n}
                  onClick={() => setAnswer(n)}
                  className={cn(
                    "rounded-2xl border-2 py-3 text-lg font-bold transition",
                    answer === n ? "border-brand bg-brand-soft" : "border-line hover:bg-surface-2",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted">
              <span>{ex.minLabel}</span>
              <span>{ex.maxLabel}</span>
            </div>
          </div>
        )}
      </div>

      {hasDraft && !pending && (
        <p className="mt-1.5 text-xs text-muted">📝 Đã lưu nháp trên máy này. Bấm lưu để gửi câu trả lời.</p>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}

      {result && result.risk === "none" && (
        <p role="status" className="mt-3 animate-[fadein_.3s_ease] rounded-2xl bg-mint px-4 py-2.5 text-sm">
          {result.correct === true
            ? "🎉 Chính xác! Bạn nắm bài rồi đó."
            : result.correct === false
              ? "Chưa đúng lắm, đáp án đúng được đánh dấu viền xanh. Đọc lại phần trên rồi thử lại nhé!"
              : "Đã lưu câu trả lời của bạn. Cảm ơn bạn đã dành thời gian cho chính mình 💚"}
        </p>
      )}
      {result && result.risk !== "none" && (
        <div className="mt-3 space-y-3">
          <p className="rounded-2xl bg-sky px-4 py-2.5 text-sm">
            Cảm ơn bạn đã thật lòng chia sẻ. Có vẻ bạn đang trải qua chuyện không dễ dàng. Bạn không phải một mình đâu.
          </p>
          {result.teacherNotified ? supportCardNotified : supportCard}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={submit} disabled={pending || answer === null} className={btn.primary}>
          {pending ? "Đang lưu…" : submitted ? "Lưu lại" : ex.answer !== undefined ? "Kiểm tra" : "Lưu câu trả lời"}
        </button>
        <button type="button" onClick={() => setHelpOpen(!helpOpen)} aria-expanded={helpOpen} className={btn.secondary}>
          🙋 Mình cần giúp
        </button>
      </div>

      {helpOpen && (
        <HelpPanel
          lessonSlug={lessonSlug}
          exercise={ex}
          showHint={showHint}
          onHint={() => setShowHint(true)}
        />
      )}
    </section>
  );
}

function HelpPanel({
  lessonSlug,
  exercise,
  showHint,
  onHint,
}: {
  lessonSlug: string;
  exercise: Exercise;
  showHint: boolean;
  onHint: () => void;
}) {
  const { name, emoji } = useAssistant();

  return (
    <div className="mt-3 animate-[fadein_.3s_ease] rounded-2xl bg-surface-2 p-4">
      <p className="mb-3 text-sm font-semibold">Bạn muốn ai giúp?</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <HelpOption emoji="💡" title="Xem gợi ý" desc="Một chút gợi ý để bắt đầu" onClick={onHint} />
        {/* mục 5.3: máy chủ đưa tên bài và đề cho trợ lý; trợ lý giúp hiểu đề, chuẩn bị câu hỏi, không đưa đáp án */}
        <Link
          href={`/chat/new?bai=${encodeURIComponent(lessonSlug)}&cau=${exercise.id}`}
          className="flex flex-col rounded-2xl bg-surface p-3 text-left transition hover:ring-2 hover:ring-brand"
        >
          <span className="text-xl" aria-hidden>{emoji}</span>
          <span className="mt-1 font-semibold">Hỏi {name}</span>
          <span className="text-xs text-muted">Hiểu đề và chuẩn bị câu hỏi</span>
        </Link>
        {/* mục 5.2: không tạo cảnh báo nữa; mở lời nhờ 3 ý điền sẵn tên bài, xem trước rồi mới gửi (hoặc soạn để tự hỏi) */}
        <Link
          href={`/giup-do?bai=${encodeURIComponent(lessonSlug)}#hen-gap`}
          className="flex flex-col rounded-2xl bg-surface p-3 text-left transition hover:ring-2 hover:ring-brand"
        >
          <span className="text-xl" aria-hidden>👩‍🏫</span>
          <span className="mt-1 font-semibold">Nhờ thầy cô</span>
          <span className="text-xs text-muted">Viết lời nhờ 3 ý, xem trước rồi mới gửi</span>
        </Link>
      </div>

      {showHint && (
        <p className="mt-3 rounded-2xl bg-butter px-4 py-3 text-sm">
          💡 {exercise.hint || "Hãy đọc lại phần bài học ở trên và viết ra điều đầu tiên bạn nghĩ tới, không cần hoàn hảo."}
        </p>
      )}
    </div>
  );
}

function HelpOption({ emoji, title, desc, onClick }: { emoji: string; title: string; desc: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col rounded-2xl bg-surface p-3 text-left transition hover:ring-2 hover:ring-brand">
      <span className="text-xl" aria-hidden>{emoji}</span>
      <span className="mt-1 font-semibold">{title}</span>
      <span className="text-xs text-muted">{desc}</span>
    </button>
  );
}
