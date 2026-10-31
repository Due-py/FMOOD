"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { answerWorryFollowup } from "@/app/actions/worries";
import { BadgesCard, type LoopBadge } from "@/app/(app)/checkin/WorryStep";
import { LevelPicker, WeatherCloud } from "@/components/LevelPicker";
import { useAssistant } from "@/components/mascot/AssistantContext";
import { WorryNextTime } from "./PracticeFollowupCard";
import { PhoneIcon } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import type { FollowupLines, FollowupLoop, FollowupWorry } from "@/lib/loop-content";
import type { FollowupResult } from "@/lib/worries";
import { followupMoment, LEVEL_LABELS, TRIED, TRIED_LABEL, type Feeling, type Tried } from "@/lib/worries-shared";

const TRIED_EMOJI: Record<Tried, string> = { not_yet: "⏳", no_help: "🤷", helped: "👍" };

/** Lời trợ lý sau câu "đã thử chưa" (HD06): chưa thử thì không trách, chưa đỡ thì đổi cách, có ích thì giữ lại. */
const TRIED_LINE: Record<Tried, string> = {
  not_yet: "Chưa thử cũng không sao đâu. Lúc nào tiện thì thử, hoặc chọn một việc dễ hơn cũng được.",
  no_help: "Cảm ơn bạn đã thử. Việc đó chưa hợp với bạn thì mình đổi sang cách khác nhé, mình sẽ không gợi ý lại việc đó.",
  helped: "Việc đó có ích với bạn. Lần sau gặp chuyện tương tự, bạn có thể dùng lại nó.",
};

const FEELING_BUTTONS: { feeling: Exclude<Feeling, "done">; label: string; emoji: string }[] = [
  { feeling: "better", label: "Đỡ hơn", emoji: "🙂" },
  { feeling: "same", label: "Vẫn vậy", emoji: "😐" },
  { feeling: "worse", label: "Nặng hơn", emoji: "😣" },
];

/** Thẻ "… hỏi thăm" (tên nhân vật) trên Trang chủ: hỏi lại chuyện tới hạn sớm nhất. Không bắt buộc trả lời. */
export function FollowupCard({ loop }: { loop: FollowupLoop }) {
  const { name, emoji } = useAssistant();
  return (
    <section aria-label={`${name} hỏi thăm`} className="rounded-[var(--radius-card)] border-2 border-dashed border-ink/15 bg-sky p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-muted">
        <span aria-hidden>{emoji}</span> {name} hỏi thăm
      </p>
      {loop.waitingDays && <p className="mt-0.5 text-xs text-muted">Câu này để dành cho bạn, không vội đâu.</p>}
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
 * `answer`: trang Trình diễn của admin truyền vào để trả lời thay một bạn MẪU (mặc định là học sinh đang đăng nhập).
 */
export function FollowupForm({
  worry,
  ask,
  lines,
  badges,
  hasSteps,
  onFinished,
  answer = answerWorryFollowup,
}: {
  worry: FollowupWorry;
  ask: string;
  lines: FollowupLines;
  badges: Record<string, LoopBadge>;
  hasSteps: boolean;
  onFinished?: () => void;
  answer?: (worryId: string, level: number, feeling: Feeling, tried: Tried | null, triedAction: string | null) => Promise<FollowupResult>;
}) {
  const [level, setLevel] = useState<number | null>(null);
  // HD06: đã thử việc nhỏ chưa (không bắt buộc trả lời); việc nào (khi đã làm nhiều việc cho chuyện này)
  const [tried, setTried] = useState<Tried | null>(null);
  const [action, setAction] = useState<string | null>(worry.actionsDone[0]?.key ?? null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ feeling: Feeling; level: number; tried: Tried | null; line: string; badges: LoopBadge[]; alerted: boolean } | null>(
    null,
  );
  const [pending, start] = useTransition();

  function send(feeling: Feeling) {
    if (!level) {
      setError("Chọn một đám mây gần đúng nhất trước nhé.");
      return;
    }
    setError(null);
    start(async () => {
      const res = await answer(worry.id, level, feeling, tried, tried && tried !== "not_yet" ? action : null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const pool = lines[followupMoment(feeling)];
      setResult({
        feeling,
        level,
        tried: res.tried,
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
        <p className="rounded-3xl rounded-bl-md bg-surface px-4 py-3 leading-relaxed">
          {result.line}
          {result.tried && <span className="mt-1 block">{TRIED_LINE[result.tried]}</span>}
        </p>
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
        {/* mục 4.1: "Lần sau bạn sẽ chỉnh gì?" (không bắt buộc). Chỉ khi chính học sinh trả lời, không ở trang Trình diễn */}
        {answer === answerWorryFollowup && <WorryNextTime worryId={worry.id} />}

        <div className="flex flex-wrap gap-2">
          {result.feeling === "worse" && (
            <Link href="/giup-do" className={cn(btn.danger, "px-5")}>
              <PhoneIcon size={16} /> Cần giúp ngay
            </Link>
          )}
          {hasSteps && (result.feeling === "same" || result.tried === "no_help" || result.tried === "not_yet") && result.feeling !== "done" && (
            <Link href={steps} className="rounded-full bg-mint px-4 py-2.5 text-sm font-semibold">
              {result.tried === "not_yet" ? "🌱 Xem việc nhỏ dễ làm" : "🌱 Thử một việc nhỏ khác"}
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
        {worry.difficulty && <span className="mt-1 block text-sm text-muted">Khó khăn bạn đã xác nhận: “{worry.difficulty}”</span>}
      </p>

      <LevelPicker
        name={`followup-${worry.id}`}
        value={level}
        onChange={(v) => {
          setLevel(v);
          setError(null);
        }}
      />

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">
          {worry.actionsDone.length ? "Bạn đã thử việc nhỏ cho chuyện này chưa?" : "Mấy hôm nay bạn đã thử việc nhỏ nào cho chuyện này chưa?"}
          <span className="font-normal text-muted"> (không bắt buộc)</span>
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {TRIED.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tried === t}
              onClick={() => setTried(tried === t ? null : t)}
              className={cn(
                "rounded-2xl border-2 px-3 py-2.5 text-left text-sm font-semibold transition",
                tried === t ? "border-ink/60 bg-surface" : "border-transparent bg-surface/60 hover:bg-surface",
              )}
            >
              <span aria-hidden>{TRIED_EMOJI[t]} </span>
              {TRIED_LABEL[t]}
            </button>
          ))}
        </div>
        {tried && tried !== "not_yet" && worry.actionsDone.length > 1 && (
          <label className="mt-2 block text-sm">
            <span className="mb-1 block font-semibold">Việc nào?</span>
            <select value={action ?? ""} onChange={(e) => setAction(e.target.value || null)} className="w-full rounded-2xl border border-line bg-surface px-3 py-2">
              {worry.actionsDone.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.title}
                </option>
              ))}
            </select>
          </label>
        )}
        {tried && tried !== "not_yet" && worry.actionsDone.length === 1 && (
          <p className="mt-2 text-sm text-muted">Việc bạn đã làm: {worry.actionsDone[0].title}</p>
        )}
      </fieldset>

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
