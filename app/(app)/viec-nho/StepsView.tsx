"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { finishTinyAction, reflectTinyAction, skipTinyAction, toldSomeone } from "@/app/actions/support-steps";
import { BadgesCard, type LoopBadge } from "@/app/(app)/checkin/WorryStep";
import { May } from "@/components/mascot/May";
import { SpeechBubble } from "@/components/SpeechBubble";
import { ArrowLeft } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import type { StepAction, StepsLoop } from "@/lib/loop-content";

const WHO: { key: "parent" | "teacher" | "friend"; label: string; emoji: string }[] = [
  { key: "parent", label: "Bố mẹ", emoji: "👨‍👩‍👧" },
  { key: "teacher", label: "Thầy cô", emoji: "🧑‍🏫" },
  { key: "friend", label: "Bạn thân", emoji: "🧑‍🤝‍🧑" },
];

const TONES = ["bg-mint", "bg-butter", "bg-sky"];

const REFLECT_CHOICES = [
  { value: "helped", label: "Có ích" },
  { value: "no_help", label: "Chưa hợp lắm" },
  { value: "unsure", label: "Chưa biết" },
] as const;

export function StepsView({ loop }: { loop: StepsLoop }) {
  const worryId = loop.worry?.id ?? null;
  // việc học sinh bấm "Bỏ qua": ẩn đi (không hỏi lý do)
  const [skipped, setSkipped] = useState<string[]>([]);
  const shown = loop.actions.filter((a) => !skipped.includes(a.key));
  return (
    <div className="space-y-8">
      <Link href="/home" className={cn(btn.ghost, "-ml-3")}>
        <ArrowLeft size={18} /> Trang chủ
      </Link>

      <div className="flex items-end gap-3">
        <May size={72} mood="caring" float={false} />
        <SpeechBubble className="mb-2 flex-1 space-y-1.5">
          {loop.worry?.difficulty ? (
            <>
              <p>
                Bạn đã xác nhận: <strong>“{loop.worry.difficulty}”</strong>.
              </p>
              <p>Mình chọn mấy việc hợp với đúng điều đó. Chọn một việc thôi là đủ rồi, không hợp thì bỏ qua.</p>
            </>
          ) : (
            <p>
              {loop.worry
                ? `Cho chuyện ${loop.worry.label.toLowerCase()}, mình gợi ý mấy việc nhỏ này. Chọn một việc thôi là đủ rồi.`
                : "Một việc nhỏ cũng là một bước. Chọn thử một việc nhé, không cần làm hết đâu."}
            </p>
          )}
          {loop.skippedUnhelpful > 0 && <p className="text-sm text-muted">Việc bạn đã thử mà chưa đỡ, mình không gợi ý lại.</p>}
        </SpeechBubble>
      </div>

      {loop.actions.length > 0 && (
        <section aria-labelledby="viec-nho-title" className="space-y-3">
          <h1 id="viec-nho-title" className="font-display text-2xl font-extrabold tracking-tight">
            Thử một việc nhỏ
          </h1>
          {shown.map((a, i) => (
            <ActionCard
              key={a.key}
              action={a}
              tone={TONES[i % TONES.length]}
              worryId={worryId}
              loop={loop}
              onSkip={() => {
                setSkipped((cur) => [...cur, a.key]);
                void skipTinyAction(a.key, worryId);
              }}
            />
          ))}
          {shown.length === 0 && (
            <p className="rounded-[var(--radius-card)] bg-surface-2 p-4 text-sm">
              Bạn đã bỏ qua hết các việc gợi ý. Không sao cả: bạn có thể kể với một người thật ở bên dưới, hoặc quay lại lúc khác.
            </p>
          )}
        </section>
      )}

      {(loop.openers.parent.length > 0 || loop.openers.teacher.length > 0 || loop.openers.friend.length > 0) && (
        <TellSomeone loop={loop} worryId={worryId} />
      )}
    </div>
  );
}

/**
 * Một việc nhỏ (có mã HD, "dùng khi"): bấm để mở các bước, đánh dấu từng bước, rồi "Mình làm xong rồi",
 * sau đó trả lời câu nhìn lại. Không hợp thì "Bỏ qua việc này".
 */
function ActionCard({
  action,
  tone,
  worryId,
  loop,
  onSkip,
}: {
  action: StepAction;
  tone: string;
  worryId: string | null;
  loop: StepsLoop;
  onSkip: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<boolean[]>(() => action.steps.map(() => false));
  const [done, setDone] = useState<{ line: string; badges: LoopBadge[] } | null>(null);
  const [reflected, setReflected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <article className={cn("rounded-[var(--radius-card)] p-5", tone)}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start justify-between gap-3 text-left">
        <span>
          <span className="block font-display text-lg font-bold tracking-tight">{action.title}</span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-surface/70 px-2.5 py-0.5 text-xs font-semibold">⏱ {action.minutes} phút</span>
            {action.forDifficulty && <span className="rounded-full bg-surface/70 px-2.5 py-0.5 text-xs font-semibold">✓ hợp với điều bạn đã xác nhận</span>}
            {action.code && <span className="text-xs font-semibold text-muted">{action.code}</span>}
          </span>
          {action.when && <span className="mt-1.5 block text-sm">Dùng khi: {action.when}</span>}
        </span>
        <span className="shrink-0 rounded-full bg-surface px-3 py-1.5 text-sm font-semibold">{done ? "✓ Đã làm" : open ? "Thu gọn" : "Bắt đầu"}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          <ol className="space-y-2">
            {action.steps.map((step, i) => (
              <li key={i}>
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-surface/70 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={checked[i]}
                    onChange={() => setChecked(checked.map((c, j) => (j === i ? !c : c)))}
                    className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]"
                  />
                  <span className={cn(checked[i] && "text-muted line-through")}>{step}</span>
                </label>
              </li>
            ))}
          </ol>
          {action.lessonSlug && (
            <Link href={`/library/${action.lessonSlug}`} className="inline-block text-sm font-semibold underline underline-offset-4">
              Đọc bài liên quan trong thư viện
            </Link>
          )}
          {action.linkTo === "help" && (
            <Link
              href={`/giup-do${worryId ? `?chuyen=${worryId}` : ""}#hen-gap`}
              className="ml-3 inline-block text-sm font-semibold underline underline-offset-4"
            >
              Soạn lời nhờ thầy cô
            </Link>
          )}
          {done ? (
            <div className="space-y-3">
              <div className="flex items-end gap-3">
                <May size={56} mood="cheer" float={false} />
                <SpeechBubble className="mb-1 flex-1">{done.line}</SpeechBubble>
              </div>
              <BadgesCard badges={done.badges} />
              {action.reflect && (
                <div className="rounded-2xl bg-surface/70 p-3" role="group" aria-label="Nhìn lại">
                  <p className="text-sm font-semibold">{action.reflect}</p>
                  {reflected ? (
                    <p className="mt-2 text-sm text-muted">Cảm ơn bạn. Mình ghi nhận rồi.</p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {REFLECT_CHOICES.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => {
                            setReflected(c.value);
                            void reflectTinyAction(action.key, worryId, c.value);
                          }}
                          className="rounded-full bg-surface px-3 py-1.5 text-sm font-semibold"
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={pending}
                className={btn.primary}
                onClick={() =>
                  start(async () => {
                    setError(null);
                    const res = await finishTinyAction(action.key, worryId);
                    if (!res.ok) {
                      setError(res.error);
                      return;
                    }
                    const badge = loop.badges["thu-viec-nho"];
                    setDone({
                      line: loop.doneLines[Math.floor(Math.random() * loop.doneLines.length)] ?? "Bạn làm được rồi!",
                      badges: res.firstTime && badge ? [badge] : [],
                    });
                  })
                }
              >
                {pending ? "Đang lưu…" : "Mình làm xong rồi"}
              </button>
              <button type="button" onClick={onSkip} className={btn.ghost}>
                Bỏ qua việc này
              </button>
              {error && (
                <span role="alert" className="text-sm text-danger">
                  {error}
                </span>
              )}
            </div>
          )}
        </div>
      )}
      {!open && !done && (
        <button type="button" onClick={onSkip} className="mt-2 text-sm font-semibold text-muted underline underline-offset-4">
          Bỏ qua việc này
        </button>
      )}
    </article>
  );
}

/** "Muốn kể với ai?": câu mở lời để chép hoặc tự nói, rồi "Mình đã kể rồi". */
function TellSomeone({ loop, worryId }: { loop: StepsLoop; worryId: string | null }) {
  const choices = WHO.filter((w) => loop.openers[w.key].length > 0);
  const [who, setWho] = useState(choices[0]?.key ?? "parent");
  const [copied, setCopied] = useState<string | null>(null);
  const [told, setTold] = useState<LoopBadge[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
    } catch {
      setCopied(null);
    }
  }

  return (
    <section id="ke-voi-ai" aria-labelledby="ke-voi-ai-title" className="scroll-mt-24 space-y-4">
      <div>
        <h2 id="ke-voi-ai-title" className="font-display text-2xl font-extrabold tracking-tight">
          Muốn kể với ai?
        </h2>
        <p className="mt-1 text-muted">Kể với một người thật giúp bạn không phải gánh một mình. Đây là vài câu để bắt đầu.</p>
      </div>

      <div role="tablist" aria-label="Kể với" className="flex flex-wrap gap-2">
        {choices.map((w) => (
          <button
            key={w.key}
            type="button"
            role="tab"
            aria-selected={who === w.key}
            onClick={() => setWho(w.key)}
            className={cn(
              "rounded-full border-2 px-4 py-2 font-semibold transition",
              who === w.key ? "border-ink/70 bg-surface" : "border-transparent bg-surface-2 hover:bg-surface",
            )}
          >
            <span aria-hidden>{w.emoji}</span> {w.label}
          </button>
        ))}
      </div>

      <ul className="space-y-2.5">
        {loop.openers[who].map((text) => (
          <motion.li key={text} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-end gap-2">
            <p className="flex-1 rounded-3xl rounded-br-md bg-brand px-4 py-3 text-brand-ink">{text}</p>
            <button type="button" onClick={() => copy(text)} className="shrink-0 rounded-full bg-surface-2 px-3 py-2 text-sm font-semibold hover:bg-surface">
              {copied === text ? "Đã sao chép" : "Sao chép"}
            </button>
          </motion.li>
        ))}
      </ul>

      {copied && (
        <p role="status" className="rounded-2xl bg-surface-2 px-4 py-2.5 text-sm">
          Đã sao chép câu vào bộ nhớ. <strong>Câu này chưa được gửi cho ai</strong>: bạn tự dán, tự nói hoặc tự gửi khi sẵn sàng.
        </p>
      )}

      {who === "teacher" && (
        <Link
          href={`/giup-do${worryId ? `?chuyen=${worryId}` : ""}#hen-gap`}
          className="inline-block text-sm font-semibold underline underline-offset-4"
        >
          Muốn gửi lời nhờ cho thầy cô qua F-Mood? Soạn và xem trước ở đây
        </Link>
      )}

      {told ? (
        <div className="space-y-3" role="status">
          <div className="flex items-end gap-3">
            <May size={56} mood="cheer" float={false} />
            <SpeechBubble className="mb-1 flex-1">Cảm ơn bạn đã kể. Có một người thật ở bên là điều rất quý đó.</SpeechBubble>
          </div>
          <BadgesCard badges={told} />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={pending}
            className={btn.secondary}
            onClick={() =>
              start(async () => {
                setError(null);
                const res = await toldSomeone(who, worryId);
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                const badge = loop.badges["cay-cau"];
                setTold(res.firstTime && badge ? [badge] : []);
              })
            }
          >
            {pending ? "Đang lưu…" : "Mình đã kể rồi"}
          </button>
          {error && (
            <span role="alert" className="text-sm text-danger">
              {error}
            </span>
          )}
        </div>
      )}
    </section>
  );
}
