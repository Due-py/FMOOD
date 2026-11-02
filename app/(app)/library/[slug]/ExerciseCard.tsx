"use client";

import Link from "next/link";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { submitExercise } from "@/app/actions/lessons";
import { btn } from "@/components/ui/styles";
import { useAssistant } from "@/components/mascot/AssistantContext";
import { MascotArt } from "@/components/mascot/MascotArt";
import { cn } from "@/components/ui/cn";
import { clearDraft, draftKey, readDraft, writeDraft } from "@/lib/drafts";
import { EXERCISE_TYPE_LABEL, stableShuffle, type Exercise, type ExerciseAnswer } from "@/lib/exercises";
import { chunkyWhite } from "../../luyen/vui";

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

/**
 * Một bài tập: làm bài, xem gợi ý, hỏi trợ lý hoặc nhờ thầy cô.
 * Giao diện vui (Duy duyệt mẫu bài đọc 02/11): thẻ trắng bóng mềm, nhãn "Bài tập N" nghiêng, ô chọn bo tròn vẽ lại.
 */
export function ExerciseCard({ userId, lessonId, lessonSlug, exercise: ex, index, saved, supportCard, supportCardNotified, onSaved }: Props) {
  const [answer, setAnswer] = useState<ExerciseAnswer | null>(saved);
  const [submitted, setSubmitted] = useState(saved !== null);
  const [result, setResult] = useState<{
    correct: boolean | null;
    risk: string;
    teacherNotified: boolean;
  } | null>(null);
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
      setResult({
        correct: res.correct,
        risk: res.risk,
        teacherNotified: res.teacherNotified,
      });
      if (draft) clearDraft(draft);
      setHasDraft(false);
      onSaved(ex.id);
    });
  }

  const multi = Array.isArray(answer) ? answer : [];

  return (
    <section className="rounded-[28px] bg-surface p-[15px] shadow-soft sm:p-[18px] dark:border dark:border-line">
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
        <span className="-rotate-3 rounded-full bg-brand px-3 py-0.5 text-brand-ink">Bài tập {index + 1}</span>
        <span className="text-muted">{EXERCISE_TYPE_LABEL[ex.type]}</span>
        {submitted && <span className="ml-auto rounded-full bg-c2 px-2.5 py-0.5 text-c2-ink">✓ Đã lưu</span>}
      </div>
      <p className="mt-2.5 font-display text-lg font-bold leading-tight sm:text-xl">{ex.prompt}</p>

      <div className="mt-3.5">
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
            className="block min-h-[110px] w-full resize-none rounded-[18px] border-2 border-line bg-surface px-3.5 py-3 text-base outline-none transition placeholder:text-muted focus:border-brand-edge focus:ring-4 focus:ring-brand/25"
          />
        )}

        {(ex.type === "choice" || ex.type === "multi") && (
          <div className="grid gap-2 sm:grid-cols-2">
            {stableShuffle(ex.options, lessonId + ex.id).map((opt) => {
              const checked = ex.type === "choice" ? answer === opt : multi.includes(opt);
              const isRight =
                result?.correct !== null && result && ex.answer !== undefined && (Array.isArray(ex.answer) ? ex.answer.includes(opt) : ex.answer === opt);
              return (
                <label
                  key={opt}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[18px] border-2 px-3 py-2.5 text-[15px] transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand/40",
                    checked ? "border-brand-edge bg-brand-soft" : "border-line hover:bg-surface-2",
                    isRight && "ring-2 ring-[var(--series-pos)]",
                  )}
                >
                  {/* ô chọn vẽ lại cho tròn trịa; ô thật vẫn nhận bàn phím và trình đọc màn hình */}
                  <input
                    type={ex.type === "choice" ? "radio" : "checkbox"}
                    name={`${lessonId}-${ex.id}`}
                    checked={checked}
                    onChange={() => setAnswer(ex.type === "choice" ? opt : checked ? multi.filter((m) => m !== opt) : [...multi, opt])}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-6 shrink-0 place-items-center border-2 text-[13px] font-extrabold",
                      ex.type === "choice" ? "rounded-full" : "rounded-lg",
                      checked ? "border-brand-edge bg-brand text-brand-ink" : "border-line bg-surface text-transparent",
                    )}
                  >
                    ✓
                  </span>
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
                    "min-h-11 rounded-[18px] border-2 py-3 font-display text-xl font-extrabold transition",
                    answer === n ? "border-brand-edge bg-brand text-brand-ink shadow-[0_3px_0_var(--brand-edge)]" : "border-line hover:bg-surface-2",
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

      {hasDraft && !pending && <p className="mt-1.5 text-xs text-muted">📝 Đã lưu nháp trên máy này. Bấm lưu để gửi câu trả lời.</p>}
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}

      {result && result.risk === "none" && (
        <p role="status" className="mt-3 animate-[fadein_.3s_ease] rounded-[18px] bg-c2 px-3.5 py-2.5 text-sm font-semibold text-c2-ink">
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

      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={submit}
          disabled={pending || answer === null}
          className={cn(btn.primary, "whitespace-nowrap max-sm:flex-1 max-sm:px-3 max-sm:text-[15px]")}
        >
          {pending ? "Đang lưu…" : submitted ? "Lưu lại" : ex.answer !== undefined ? "Kiểm tra" : "Lưu câu trả lời"}
        </button>
        <button
          type="button"
          onClick={() => setHelpOpen(!helpOpen)}
          aria-expanded={helpOpen}
          // đang mở: nền tím nhạt (biến thể aria-expanded đứng sau lớp gốc nên thắng màu trắng của chunkyWhite)
          className={cn(
            chunkyWhite,
            "whitespace-nowrap max-sm:flex-1 max-sm:px-3 max-sm:text-[15px] aria-expanded:border-c1-mid aria-expanded:bg-c1 aria-expanded:text-c1-ink aria-expanded:shadow-[0_3px_0_var(--c1-mid)]",
          )}
        >
          <span aria-hidden>🙋</span> Mình cần giúp
        </button>
      </div>

      {helpOpen && <HelpPanel lessonSlug={lessonSlug} exercise={ex} showHint={showHint} onHint={() => setShowHint(true)} />}
    </section>
  );
}

/** Ô lựa chọn trong khung "Bạn muốn ai giúp?": điện thoại xếp ngang (ô hình bên trái), từ 640px xếp dọc. */
const helpOption =
  "grid grid-cols-[36px_1fr] items-center gap-x-2.5 rounded-[18px] bg-surface p-3 text-left transition hover:-translate-y-0.5 hover:ring-2 hover:ring-brand motion-reduce:transform-none sm:flex sm:flex-col sm:items-start dark:border dark:border-line";
const helpIcon = "row-span-2 grid size-9 place-items-center rounded-xl text-[19px]";

function HelpPanel({ lessonSlug, exercise, showHint, onHint }: { lessonSlug: string; exercise: Exercise; showHint: boolean; onHint: () => void }) {
  const { name } = useAssistant();

  return (
    <div className="mt-3 animate-[fadein_.3s_ease] rounded-[22px] bg-surface-2 p-3.5">
      <p className="mb-2.5 text-sm font-bold">Bạn muốn ai giúp?</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <button type="button" onClick={onHint} className={helpOption}>
          <span aria-hidden className={cn(helpIcon, "bg-brand-soft")}>
            💡
          </span>
          <span className="text-sm font-bold sm:mt-1.5">Xem gợi ý</span>
          <span className="text-xs leading-snug text-muted">Một chút gợi ý để bắt đầu</span>
        </button>
        {/* mục 5.3: máy chủ đưa tên bài và đề cho trợ lý; trợ lý giúp hiểu đề, chuẩn bị câu hỏi, không đưa đáp án */}
        <Link href={`/chat/new?bai=${encodeURIComponent(lessonSlug)}&cau=${exercise.id}`} className={helpOption}>
          <span aria-hidden className={cn(helpIcon, "overflow-hidden bg-c1")}>
            <MascotArt size={26} />
          </span>
          <span className="text-sm font-bold sm:mt-1.5">Hỏi {name}</span>
          <span className="text-xs leading-snug text-muted">Hiểu đề và chuẩn bị câu hỏi</span>
        </Link>
        {/* mục 5.2: không tạo cảnh báo nữa; mở lời nhờ 3 ý điền sẵn tên bài, xem trước rồi mới gửi (hoặc soạn để tự hỏi) */}
        <Link href={`/giup-do?bai=${encodeURIComponent(lessonSlug)}#hen-gap`} className={helpOption}>
          <span aria-hidden className={cn(helpIcon, "bg-c2")}>
            👩‍🏫
          </span>
          <span className="text-sm font-bold sm:mt-1.5">Nhờ thầy cô</span>
          <span className="text-xs leading-snug text-muted">Viết lời nhờ 3 ý, xem trước rồi mới gửi</span>
        </Link>
      </div>

      {showHint && (
        <p className="mt-2.5 rounded-[18px] bg-c5 px-3.5 py-3 text-sm">
          💡 {exercise.hint || "Hãy đọc lại phần bài học ở trên và viết ra điều đầu tiên bạn nghĩ tới, không cần hoàn hảo."}
        </p>
      )}
    </div>
  );
}
