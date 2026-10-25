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
}: {
  userId: string;
  lessonId: string;
  lessonSlug: string;
  exercises: Exercise[];
  saved: Record<string, ExerciseAnswer>;
  supportCard: ReactNode;
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
    <div className="mt-10 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-2xl font-extrabold tracking-tight">✏️ Luyện tập</h2>
        <span className="rounded-full bg-surface-2 px-3 py-1 text-sm font-semibold">
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
          onSaved={onSaved}
        />
      ))}
      {justFinished && (
        <motion.p
          role="status"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="rounded-[var(--radius-card)] bg-butter p-5 text-center"
        >
          <span className="block text-4xl" aria-hidden>
            🎉
          </span>
          <span className="mt-2 block font-display text-2xl font-extrabold tracking-tight">Hoàn thành!</span>
          <span className="block text-sm text-muted">Bạn đã làm xong cả {exercises.length} bài tập của bài này.</span>
        </motion.p>
      )}
      <p className="px-1 text-xs text-muted">
        Câu trả lời là riêng tư. Nếu có dấu hiệu bạn đang gặp nguy hiểm, thầy cô phụ trách sẽ được báo để kịp hỗ trợ.
      </p>
    </div>
  );
}
