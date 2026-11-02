"use client";

import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import type { Exercise, ExerciseAnswer } from "@/lib/exercises";
import { ExerciseCard } from "./ExerciseCard";

/** Các bài tập của một bài học; làm xong hết thì báo "Hoàn thành!". */
export function ExerciseList({
  userId,
  lessonId,
  lessonSlug,
  exercises,
  saved,
  supportCard,
  supportCardNotified,
}: {
  userId: string;
  lessonId: string;
  lessonSlug: string;
  exercises: Exercise[];
  saved: Record<string, ExerciseAnswer>;
  supportCard: ReactNode;
  /** thẻ có dòng "thầy cô đã được báo": chỉ hiện khi máy chủ xác nhận đã ghi cảnh báo */
  supportCardNotified: ReactNode;
}) {
  const [done, setDone] = useState(() => new Set(Object.keys(saved)));
  const [justFinished, setJustFinished] = useState(false);
  const allDone = exercises.every((ex) => done.has(ex.id));

  function onSaved(id: string) {
    if (done.has(id)) return;
    const next = new Set(done).add(id);
    setDone(next);
    if (exercises.every((ex) => next.has(ex.id))) setJustFinished(true);
  }

  return (
    <div className="mt-9 space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-[28px] font-extrabold leading-tight">
          <span aria-hidden>✏️ </span>Luyện tập
        </h2>
        <span className="rounded-full bg-surface px-3.5 py-1 text-sm font-extrabold shadow-soft dark:border dark:border-line">
          {allDone ? "✓ Đã làm xong" : `${exercises.filter((ex) => done.has(ex.id)).length}/${exercises.length} bài`}
        </span>
      </div>
      {exercises.map((ex, i) => (
        <ExerciseCard
          key={ex.id}
          userId={userId}
          lessonId={lessonId}
          lessonSlug={lessonSlug}
          exercise={ex}
          index={i}
          saved={saved[ex.id] ?? null}
          supportCard={supportCard}
          supportCardNotified={supportCardNotified}
          onSaved={onSaved}
        />
      ))}
      {justFinished && (
        <motion.p
          role="status"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="rounded-[26px] bg-brand p-5 text-center text-brand-ink"
        >
          <span className="block text-[38px]" aria-hidden>
            🎉
          </span>
          <span className="block font-display text-[26px] font-extrabold leading-tight">Hoàn thành!</span>
          <span className="block text-sm">Bạn đã làm xong cả {exercises.length} bài tập của bài này.</span>
        </motion.p>
      )}
      <p className="px-1 text-xs text-muted">
        <span aria-hidden>🔒 </span>Câu trả lời là riêng tư. Nếu có dấu hiệu bạn đang gặp nguy hiểm, thầy cô phụ trách sẽ được báo để kịp hỗ trợ.
      </p>
    </div>
  );
}
