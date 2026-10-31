"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Markdown from "react-markdown";
import { markTestStart } from "@/app/actions/bai-do";
import { submitSurvey } from "@/app/actions/student-extras";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { clearDraft, draftKey, readDraft, writeDraft } from "@/lib/drafts";
import { isQuestionShown, maxAnswerLength, type SurveyAnswers, type SurveyKind, type SurveyQuestion } from "@/lib/surveys";

export type SupportCards = { urgent: ReactNode; gentle: ReactNode; urgentNotified: ReactNode; gentleNotified: ReactNode };

type Done = { risk: "none" | "concern" | "urgent"; teacherNotified: boolean; crisis: string | null };

/**
 * Phiếu khảo sát / bài đo kỹ năng. Bài đo (kind "test") thêm: không dán chữ vào ô trả lời (đếm số lần thử),
 * ghi lúc bắt đầu để tính thời gian làm bài, lưu nháp trên máy để lỡ tải lại trang không mất bài.
 */
export function SurveyForm({
  surveyId,
  questions,
  kind = "survey",
  userId,
  startedAt,
  supportCards,
}: {
  surveyId: string;
  questions: SurveyQuestion[];
  kind?: SurveyKind;
  /** để lưu nháp riêng cho từng học sinh (bài đo) */
  userId?: string;
  /** giờ máy chủ lúc mở bài (bài đo) */
  startedAt?: string;
  supportCards?: SupportCards;
}) {
  const router = useRouter();
  const isTest = kind === "test";
  const key = isTest && userId ? draftKey(userId, "bai-do", surveyId) : null;
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [pasteNotice, setPasteNotice] = useState(false);
  const pasteBlocked = useRef(0);
  const started = useRef<string | null>(null);
  const [pending, startTransition] = useTransition();

  // bài đo: lấy lại nháp và mốc bắt đầu (lỡ tải lại trang vẫn giữ giờ bắt đầu cũ)
  useEffect(() => {
    if (!isTest) return;
    if (key) {
      try {
        const saved = JSON.parse(readDraft(key) ?? "null") as SurveyAnswers | null;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage chỉ đọc được sau khi trang đã hiện
        if (saved && typeof saved === "object") setAnswers(saved);
      } catch {}
    }
    const startKey = `fmood-bai-do-bat-dau:${surveyId}`;
    try {
      const old = sessionStorage.getItem(startKey);
      if (old) started.current = old;
      else {
        started.current = startedAt ?? new Date().toISOString();
        sessionStorage.setItem(startKey, started.current);
        void markTestStart(surveyId);
      }
    } catch {
      started.current = startedAt ?? null;
    }
  }, [isTest, key, surveyId, startedAt]);

  const set = (id: string, value: string | number) =>
    setAnswers((a) => {
      const next = { ...a, [id]: value };
      if (key) writeDraft(key, JSON.stringify(next));
      return next;
    });

  const blockPaste = (e: React.ClipboardEvent | React.DragEvent) => {
    if (!isTest) return;
    e.preventDefault();
    pasteBlocked.current += 1;
    setPasteNotice(true);
  };

  if (done) {
    return (
      <div className="mt-6 space-y-3">
        {done.risk === "urgent" && done.crisis && (
          <div className="rounded-3xl border border-danger/30 bg-danger-soft px-5 py-4 leading-relaxed [&_li]:ml-4 [&_li]:list-disc [&_p+p]:mt-2 [&_ul]:mt-2 [&_ul]:space-y-1">
            <Markdown>{done.crisis}</Markdown>
          </div>
        )}
        {done.risk === "concern" && (
          <p className="rounded-2xl bg-sky px-4 py-2.5 text-sm">
            Cảm ơn bạn đã thật lòng chia sẻ. Có vẻ bạn đang trải qua chuyện không dễ dàng. Bạn không phải một mình đâu.
          </p>
        )}
        {done.risk !== "none" &&
          supportCards &&
          (done.risk === "urgent"
            ? done.teacherNotified
              ? supportCards.urgentNotified
              : supportCards.urgent
            : done.teacherNotified
              ? supportCards.gentleNotified
              : supportCards.gentle)}
        <p className="rounded-3xl bg-mint p-6 text-center font-semibold">
          {isTest ? "Em đã nộp bài. Cảm ơn em đã làm bài!" : "🎉 Đã gửi. Cảm ơn bạn đã giúp nhóm hiểu học sinh hơn!"}
        </p>
      </div>
    );
  }

  const shown = questions.filter((q) => isQuestionShown(q, answers));
  const max = maxAnswerLength(kind);

  return (
    <form
      action={() =>
        startTransition(async () => {
          setError(null);
          const visible = Object.fromEntries(Object.entries(answers).filter(([id]) => shown.some((q) => q.id === id)));
          const res = await submitSurvey(surveyId, visible, isTest ? { startedAt: started.current, pasteBlocked: pasteBlocked.current } : {});
          if (res.ok) {
            if (key) clearDraft(key);
            setDone({ risk: res.risk, teacherNotified: res.teacherNotified, crisis: res.crisis });
            router.refresh();
          } else setError(res.error);
        })
      }
      className="mt-6 space-y-4"
    >
      {shown.map((q, i) => (
        <fieldset key={q.id} className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <legend className="sr-only">{q.text}</legend>
          <QuestionText text={q.text} number={isTest ? null : i + 1} optional={!q.required && !isTest} />

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
              onPaste={blockPaste}
              onDrop={blockPaste}
              rows={isTest ? 4 : 3}
              maxLength={max}
              aria-label={q.text}
              autoComplete="off"
              className="mt-3 w-full resize-y rounded-2xl border border-line bg-surface px-4 py-3 outline-none focus:border-brand"
            />
          )}
        </fieldset>
      ))}

      {pasteNotice && (
        <p role="status" className="rounded-2xl bg-butter px-4 py-2.5 text-sm">
          Bài đo không dán chữ được. Em gõ trực tiếp câu trả lời của mình nhé.
        </p>
      )}
      {shown.some((q) => q.type === "text") && (
        <p className="text-xs text-muted">
          {isTest
            ? "Người chấm và thầy cô không thấy tên em. Riêng khi câu em viết có dấu hiệu em đang gặp chuyện đáng lo, tư vấn viên của trường sẽ được báo, chỉ kèm đúng câu đó, để kịp hỗ trợ em."
            : "Thầy cô chỉ xem kết quả chung của cả lớp. Riêng khi câu bạn tự viết có dấu hiệu bạn đang gặp nguy hiểm, phòng tham vấn sẽ được báo, chỉ kèm đúng câu đó, để kịp hỗ trợ bạn."}
        </p>
      )}
      {error && <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
      <button type="submit" disabled={pending} className={cn(btn.primary, "w-full py-4")}>
        {pending ? "Đang gửi…" : isTest ? "Nộp bài" : "Gửi câu trả lời"}
      </button>
    </form>
  );
}

/** Câu hỏi; phần tả tình huống (trước dòng trống cuối) in thường, phần câu hỏi in đậm. */
function QuestionText({ text, number, optional }: { text: string; number: number | null; optional: boolean }) {
  const parts = text.split(/\n\s*\n/);
  const question = parts.pop() ?? "";
  const context = parts.join("\n\n");
  return (
    <>
      {context && <p className="mb-3 whitespace-pre-wrap rounded-2xl bg-surface-2 px-4 py-3 leading-relaxed">{context}</p>}
      <p className="whitespace-pre-wrap font-semibold">
        {number !== null && <span className="text-muted">{number}. </span>}
        {question}
        {optional && <span className="ml-1 text-xs font-normal text-muted">(không bắt buộc)</span>}
      </p>
    </>
  );
}
