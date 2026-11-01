"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useState, useTransition } from "react";
import { deleteWorry } from "@/app/actions/worries";
import { TOPIC_TONE } from "@/app/(app)/checkin/WorryStep";
import { CloudStep, FollowupForm } from "@/app/(app)/home/FollowupCard";
import { DifficultyConfirm } from "@/components/DifficultyConfirm";
import { useAssistant } from "@/components/mascot/AssistantContext";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { formatDate } from "@/lib/dates";
import type { JourneyLoop, JourneyWorry } from "@/lib/loop-content";
import { canAnswer, TRIED_LABEL, type WorryStatus } from "@/lib/worries-shared";
import { Empty, Section } from "./Section";

const STATUS_LABEL: Record<WorryStatus, string> = {
  open: "Đang theo dõi",
  better: "Đã nhẹ lòng",
  done: "Đã xong",
  stale: "Lâu không cập nhật",
};

/**
 * Chuyện bận lòng: chuyện đang theo dõi hiện thẻ gọn; chuyện đã qua gập lại sẵn.
 * Việc nhỏ đã thử, huy hiệu, giọt nước nằm ở khối Ghi nhận (Recognition), không ở đây.
 */
export function WorrySection({ loop }: { loop: JourneyLoop }) {
  const following = loop.worries.filter((w) => w.status === "open");
  const past = loop.worries.filter((w) => w.status !== "open");

  return (
    <Section id="chuyen-ban-long" title="Chuyện bận lòng">
      {following.length ? (
        following.map((w) => <WorryCard key={w.id} worry={w} loop={loop} />)
      ) : (
        <Empty>
          Chưa có chuyện nào đang theo dõi.{" "}
          <Link href="/checkin" className="font-semibold text-brand-strong underline underline-offset-4">
            Check-in
          </Link>{" "}
          khi bạn muốn kể nhé.
        </Empty>
      )}

      {past.length > 0 && (
        <details className="group rounded-[var(--radius-card)] border border-line bg-surface">
          <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-semibold [&::-webkit-details-marker]:hidden">
            <span className="flex-1">Đã qua ({past.length})</span>
            <span aria-hidden className="text-muted transition group-open:rotate-180">
              ▾
            </span>
          </summary>
          <div className="space-y-3 border-t border-line p-3">
            {past.map((w) => (
              <WorryCard key={w.id} worry={w} loop={loop} />
            ))}
          </div>
        </details>
      )}
    </Section>
  );
}

/** Một chuyện bận lòng: các đám mây từ lúc kể tới bây giờ, cập nhật hoặc xóa. */
function WorryCard({ worry, loop }: { worry: JourneyWorry; loop: JourneyLoop }) {
  const { name } = useAssistant();
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "update" | "delete" | "difficulty">("view");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const open = worry.status === "open";
  const nextTime = worry.checks.findLast((c) => c.nextTime)?.nextTime ?? null;
  const checkLine = open
    ? worry.nextCheckAt
      ? `${name} sẽ hỏi thăm lại ngày ${formatDate(worry.nextCheckAt)}.`
      : `${name} thôi hỏi chuyện này rồi. Bạn tự cập nhật khi muốn nhé.`
    : worry.status === "stale"
      ? "Lâu rồi chưa cập nhật. Muốn thì bạn cập nhật lại nhé."
      : null;

  return (
    <article className={cn("rounded-[var(--radius-card)] p-5", open ? (TOPIC_TONE[worry.topic] ?? "bg-surface-2") : "border border-line bg-surface")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-lg font-bold tracking-tight">
          <span aria-hidden>{worry.emoji}</span> {worry.label}
        </span>
        <span className="rounded-full bg-surface/70 px-2.5 py-0.5 text-xs font-semibold">{STATUS_LABEL[worry.status]}</span>
      </div>
      {worry.note && <p className="mt-2 italic">“{worry.note}”</p>}

      {mode === "difficulty" && (
        <DifficultyConfirm
          className="mt-3"
          text={worry.difficulty ?? ""}
          worryId={worry.id}
          source="journey"
          ownWords
          askFirst
          onConfirmed={() => {
            setMode("view");
            router.refresh();
          }}
          onSkip={() => setMode("view")}
        />
      )}

      {/* đường đi của đám mây: lúc kể → từng lần hỏi lại */}
      <ol aria-label="Mức lo theo thời gian" className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-3">
        <li>
          <CloudStep level={worry.levelStart} caption={`kể ${formatDate(worry.createdAt)}`} />
        </li>
        {worry.checks.map((c, i) => (
          <Fragment key={c.at}>
            <li aria-hidden className="text-muted">
              →
            </li>
            <li>
              <CloudStep level={c.level} caption={i === worry.checks.length - 1 ? `mới nhất ${formatDate(c.at)}` : formatDate(c.at)} />
              {c.tried && <span className="block text-center text-[11px] text-muted">{TRIED_LABEL[c.tried]}</span>}
            </li>
          </Fragment>
        ))}
      </ol>

      {checkLine && <p className="mt-3 text-sm text-muted">{checkLine}</p>}

      {mode === "update" && (
        <div className="mt-2 rounded-3xl bg-surface/60 p-4">
          <FollowupForm
            worry={worry}
            ask={loop.ask}
            lines={loop.lines}
            badges={loop.badgeInfo}
            hasSteps={loop.hasSteps}
            onFinished={() => {
              setMode("view");
              router.refresh();
            }}
          />
        </div>
      )}

      {mode === "delete" && (
        <div className="mt-3 rounded-3xl bg-surface p-4" role="alertdialog" aria-label="Xóa chuyện này?">
          <p className="font-semibold">Xóa chuyện này?</p>
          <p className="text-sm text-muted">Các lần hỏi lại của chuyện này cũng mất. Giọt nước và huy hiệu bạn đã có vẫn giữ nguyên.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              className={btn.danger}
              onClick={() =>
                start(async () => {
                  const res = await deleteWorry(worry.id);
                  if (!res.ok) setError(res.error);
                })
              }
            >
              {pending ? "Đang xóa…" : "Xóa"}
            </button>
            <button type="button" onClick={() => setMode("view")} className={btn.secondary}>
              Giữ lại
            </button>
          </div>
        </div>
      )}

      {mode === "view" && (
        <div className="mt-3 flex flex-wrap items-start gap-2">
          {canAnswer(worry.status) && (
            <button type="button" onClick={() => setMode("update")} className={btn.secondary}>
              Cập nhật
            </button>
          )}
          {/* chi tiết và các lựa chọn phụ gập lại, để thẻ gọn */}
          <details className="group min-w-0 flex-1 basis-60">
            <summary className={cn(btn.ghost, "w-fit cursor-pointer list-none [&::-webkit-details-marker]:hidden")}>
              Chi tiết <span aria-hidden className="inline-block transition group-open:rotate-180">▾</span>
            </summary>
            <div className="mt-2 space-y-2 text-sm">
              {/* khó khăn đã xác nhận: trợ lý dựa vào câu này để gợi ý; mọi lần sửa đều còn lại */}
              {worry.difficulty && (
                <div className="rounded-2xl bg-surface/70 px-4 py-3">
                  <p>
                    <span className="font-semibold">Khó khăn bạn đã xác nhận:</span> {worry.difficulty}
                  </p>
                  {worry.revisions.length > 1 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-muted">Cách hiểu đã đổi {worry.revisions.length - 1} lần</summary>
                      <ol className="mt-1 space-y-0.5">
                        {worry.revisions.map((r) => (
                          <li key={r.at} className={cn(r.action === "rejected" && "text-muted line-through")}>
                            {formatDate(r.at)} · {r.text}
                            <span className="sr-only">{r.action === "rejected" ? " (bạn nói chưa đúng)" : " (bạn xác nhận)"}</span>
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}
                </div>
              )}
              {/* mục 4.1: điều bạn nói sẽ chỉnh lần sau, ở lần hỏi lại gần nhất có ghi */}
              {nextTime && (
                <p className="rounded-2xl bg-surface/70 px-4 py-2.5">
                  <span className="font-semibold">Lần sau bạn sẽ chỉnh:</span> “{nextTime}”
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {canAnswer(worry.status) && (
                  <button type="button" onClick={() => setMode("difficulty")} className={btn.ghost}>
                    {worry.difficulty ? "Sửa khó khăn" : "Ghi khó khăn"}
                  </button>
                )}
                <button type="button" onClick={() => setMode("delete")} className={btn.ghost}>
                  Xóa chuyện này
                </button>
              </div>
            </div>
          </details>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </article>
  );
}
