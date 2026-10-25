"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { answerWorryFollowup } from "@/app/actions/worries";
import { BadgesCard, type LoopBadge } from "@/app/(app)/checkin/WorryStep";
import { LevelPicker, WeatherCloud } from "@/components/LevelPicker";
import { PhoneIcon } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import type { FollowupLines, FollowupLoop, FollowupWorry } from "@/lib/loop-content";
import { followupMoment, LEVEL_LABELS, type Feeling } from "@/lib/worries-shared";

const FEELING_BUTTONS: { feeling: Exclude<Feeling, "done">; label: string; emoji: string }[] = [
  { feeling: "better", label: "Đỡ hơn", emoji: "🙂" },
  { feeling: "same", label: "Vẫn vậy", emoji: "😐" },
  { feeling: "worse", label: "Nặng hơn", emoji: "😣" },
];

/** Thẻ "Mây hỏi thăm" trên Trang chủ: hỏi lại chuyện tới hạn sớm nhất. Không bắt buộc trả lời. */
export function FollowupCard({ loop }: { loop: FollowupLoop }) {
  return (
    <section aria-label="Mây hỏi thăm" className="rounded-[var(--radius-card)] border-2 border-dashed border-ink/15 bg-sky p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-muted">
        <span aria-hidden>☁️</span> Mây hỏi thăm
      </p>
      <FollowupForm
        worry={loop.worry}
        ask={loop.ask}
        lines={loop.lines}
        badges={loop.badges}
        hasSteps={loop.hasSteps}
      />
    </section>
  );
}

/** Đám mây nhỏ kèm nhãn, để thấy mức lo lúc kể → bây giờ. */
export function CloudStep({ level, caption }: { level: number; caption: string }) {
  return (
    <span className="flex flex-col items-center text-center">
      <WeatherCloud level={level} />
      <span className="text-[11px] font-semibold leading-tight">{LEVEL_LABELS[level - 1]}</span>
      <span className="text-[11px] text-muted">{caption}</span>
    </span>
  );
}

/**
 * Hỏi lại một chuyện: chọn mức lo bây giờ rồi bấm Đỡ hơn / Vẫn vậy / Nặng hơn / Chuyện này xong rồi.
 * Dùng ở Trang chủ và khi tự cập nhật trong Hành trình. `onFinished` gọi khi học sinh bấm "Xong" ở màn hình kết quả.
 */
export function FollowupForm({
  worry,
  ask,
  lines,
  badges,
  hasSteps,
  onFinished,
}: {
  worry: FollowupWorry;
  ask: string;
  lines: FollowupLines;
  badges: Record<string, LoopBadge>;
  hasSteps: boolean;
  onFinished?: () => void;
}) {
  const [level, setLevel] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ feeling: Feeling; level: number; line: string; badges: LoopBadge[]; alerted: boolean } | null>(null);
  const [pending, start] = useTransition();

  function send(feeling: Feeling) {
    if (!level) {
      setError("Chọn một đám mây gần đúng nhất trước nhé.");
      return;
    }
    setError(null);
    start(async () => {
      const res = await answerWorryFollowup(worry.id, level, feeling);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const pool = lines[followupMoment(feeling)];
      setResult({
        feeling,
        level,
        line: pool[Math.floor(Math.random() * pool.length)] ?? "Cảm ơn bạn đã kể cho mình biết.",
        badges: res.badges.map((k) => badges[k]).filter(Boolean),
        alerted: res.alerted,
      });
    });
  }

  if (result) {
    const steps = `/viec-nho?chuyen=${worry.id}`;
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 space-y-4" role="status">
        <p className="rounded-3xl rounded-bl-md bg-surface px-4 py-3 leading-relaxed">{result.line}</p>
        <div className="flex items-center justify-center gap-3 rounded-3xl bg-surface/60 py-3">
          <CloudStep level={worry.levelStart} caption="lúc kể" />
          <span className="text-xl text-muted" aria-hidden>
            →
          </span>
          <CloudStep level={result.level} caption="bây giờ" />
        </div>
        {result.alerted && (
          <p className="rounded-3xl bg-surface px-4 py-3 text-sm leading-relaxed">
            🧑‍🏫 Mình đã báo thầy cô phụ trách để thầy cô hỏi thăm bạn. Thầy cô chỉ biết bạn đang thấy nặng lòng, không đọc được chuyện bạn kể.
          </p>
        )}
        <BadgesCard badges={result.badges} />

        <div className="flex flex-wrap gap-2">
          {result.feeling === "worse" && (
            <Link href="/giup-do" className={cn(btn.danger, "px-5")}>
              <PhoneIcon size={16} /> Cần giúp ngay
            </Link>
          )}
          {hasSteps && result.feeling === "same" && (
            <Link href={steps} className="rounded-full bg-mint px-4 py-2.5 text-sm font-semibold">
              🌱 Thử một việc nhỏ khác
            </Link>
          )}
          {hasSteps && (result.feeling === "same" || result.feeling === "worse") && (
            <Link href={`${steps}#ke-voi-ai`} className="rounded-full bg-lilac px-4 py-2.5 text-sm font-semibold">
              🌉 Muốn kể với ai?
            </Link>
          )}
          {onFinished ? (
            <button type="button" onClick={onFinished} className={btn.secondary}>
              Xong
            </button>
          ) : (
            <Link href="/me/hanh-trinh" className={btn.secondary}>
              Xem hành trình của mình
            </Link>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="mt-3 space-y-4">
      <p className="rounded-3xl rounded-bl-md bg-surface px-4 py-3 leading-relaxed">
        <span className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
          <span aria-hidden>{worry.emoji}</span> {worry.label}
          <span className="font-normal text-muted">· lúc kể: {LEVEL_LABELS[worry.levelStart - 1].toLowerCase()}</span>
        </span>
        {ask}
      </p>

      <LevelPicker
        name={`followup-${worry.id}`}
        value={level}
        onChange={(v) => {
          setLevel(v);
          setError(null);
        }}
      />

      <div>
        <p className="mb-2 text-sm font-semibold">So với lúc kể, giờ bạn thấy…</p>
        <div className="grid grid-cols-3 gap-2">
          {FEELING_BUTTONS.map((b) => (
            <button
              key={b.feeling}
              type="button"
              disabled={pending}
              onClick={() => send(b.feeling)}
              className="flex flex-col items-center gap-1 rounded-3xl bg-surface px-2 py-3 font-semibold transition hover:-translate-y-0.5 disabled:opacity-50"
            >
              <span className="text-2xl" aria-hidden>
                {b.emoji}
              </span>
              {b.label}
            </button>
          ))}
        </div>
        <button type="button" disabled={pending} onClick={() => send("done")} className={cn(btn.ghost, "-ml-3 mt-2")}>
          ✅ Chuyện này xong rồi
        </button>
      </div>

      {pending && <p className="text-sm text-muted">Đang lưu…</p>}
      {error && (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
