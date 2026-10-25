"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useState, useTransition } from "react";
import { deleteWorry } from "@/app/actions/worries";
import { TOPIC_TONE } from "@/app/(app)/checkin/WorryStep";
import { CloudStep, FollowupForm } from "@/app/(app)/home/FollowupCard";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { formatDate } from "@/lib/dates";
import type { JourneyLoop, JourneyWorry } from "@/lib/loop-content";
import { canAnswer, type WorryStatus } from "@/lib/worries-shared";

const STATUS_LABEL: Record<WorryStatus, string> = {
  open: "Đang theo dõi",
  better: "Đã nhẹ lòng",
  done: "Đã xong",
  stale: "Lâu không cập nhật",
};

export function JourneyView({ loop }: { loop: JourneyLoop }) {
  const following = loop.worries.filter((w) => w.status === "open");
  const past = loop.worries.filter((w) => w.status !== "open");

  return (
    <div className="space-y-10">
      <section aria-labelledby="dang-theo-doi" className="space-y-3">
        <h2 id="dang-theo-doi" className="font-display text-2xl font-extrabold tracking-tight">
          Đang theo dõi
        </h2>
        {following.length ? (
          following.map((w) => <WorryCard key={w.id} worry={w} loop={loop} />)
        ) : (
          <p className="rounded-3xl bg-surface-2 p-5 text-muted">
            Chưa có chuyện nào đang theo dõi.{" "}
            <Link href="/checkin" className="font-semibold text-ink underline underline-offset-4">
              Check-in
            </Link>{" "}
            khi bạn muốn kể nhé.
          </p>
        )}
      </section>

      {past.length > 0 && (
        <section aria-labelledby="da-qua" className="space-y-3">
          <h2 id="da-qua" className="font-display text-2xl font-extrabold tracking-tight">
            Đã qua
          </h2>
          {past.map((w) => (
            <WorryCard key={w.id} worry={w} loop={loop} />
          ))}
        </section>
      )}

      <section aria-labelledby="viec-nho-da-thu" className="space-y-3">
        <h2 id="viec-nho-da-thu" className="font-display text-2xl font-extrabold tracking-tight">
          Việc nhỏ đã thử
        </h2>
        {loop.actionsTried.length ? (
          <ul className="flex flex-wrap gap-2">
            {loop.actionsTried.map((a) => (
              <li key={a.key} className="rounded-full bg-mint px-4 py-2 font-semibold">
                🌱 {a.title}
                {a.times > 1 && <span className="ml-1.5 font-normal text-muted">{a.times} lần</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">
            Chưa thử việc nào.{" "}
            {loop.hasSteps && (
              <Link href="/viec-nho" className="font-semibold text-ink underline underline-offset-4">
                Xem vài việc nhỏ 2–5 phút
              </Link>
            )}
          </p>
        )}
        {loop.toldCount > 0 && (
          <p className="rounded-3xl bg-lilac px-4 py-3">🌉 Bạn đã kể chuyện của mình với một người thật {loop.toldCount} lần.</p>
        )}
      </section>

      {loop.badges.length > 0 && (
        <section aria-labelledby="huy-hieu" className="space-y-3">
          <h2 id="huy-hieu" className="font-display text-2xl font-extrabold tracking-tight">
            Huy hiệu
          </h2>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {loop.badges.map((b) => {
              const earned = Boolean(b.earnedAt);
              return (
                <li key={b.key} className={cn("flex items-center gap-3 rounded-3xl p-3", earned ? "bg-butter" : "bg-surface-2")}>
                  <span
                    className={cn(
                      "flex size-12 shrink-0 items-center justify-center rounded-full text-2xl",
                      earned ? "bg-surface shadow-sm" : "bg-surface/60 opacity-40 grayscale",
                    )}
                    aria-hidden
                  >
                    {b.emoji}
                  </span>
                  <span className="min-w-0">
                    <span className={cn("block font-semibold", !earned && "text-muted")}>{b.name}</span>
                    <span className="block text-sm text-muted">{earned ? `Nhận ngày ${formatDate(b.earnedAt as string)}` : b.how}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Link href="/garden" className="flex items-center gap-4 rounded-[var(--radius-card)] bg-gradient-to-r from-sky to-mint p-5 transition hover:-translate-y-0.5">
        <span className="text-4xl" aria-hidden>
          💧
        </span>
        <span>
          <span className="block font-display text-lg font-bold tracking-tight">Sang khu vườn</span>
          <span className="block text-sm text-muted">
            {loop.drops > 0 ? `Hành trình này đã tưới cây ${loop.drops} giọt nước.` : "Mỗi bước trong hành trình đều tưới cây của bạn."}
          </span>
        </span>
      </Link>
    </div>
  );
}

/** Một chuyện bận lòng: các đám mây từ lúc kể tới bây giờ, cập nhật hoặc xóa. */
function WorryCard({ worry, loop }: { worry: JourneyWorry; loop: JourneyLoop }) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "update" | "delete">("view");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const open = worry.status === "open";

  return (
    <article className={cn("rounded-[var(--radius-card)] p-5", open ? (TOPIC_TONE[worry.topic] ?? "bg-surface-2") : "border border-line bg-surface")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-lg font-bold tracking-tight">
          <span aria-hidden>{worry.emoji}</span> {worry.label}
        </span>
        <span className="rounded-full bg-surface/70 px-2.5 py-0.5 text-xs font-semibold">{STATUS_LABEL[worry.status]}</span>
      </div>
      {worry.note && <p className="mt-2 italic">“{worry.note}”</p>}

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
            </li>
          </Fragment>
        ))}
      </ol>

      <p className="mt-3 text-sm text-muted">
        {open
          ? worry.nextCheckAt
            ? `Mây sẽ hỏi thăm lại ngày ${formatDate(worry.nextCheckAt)}.`
            : "Mây thôi hỏi chuyện này rồi. Bạn tự cập nhật khi muốn nhé."
          : worry.status === "stale"
            ? "Lâu rồi chưa cập nhật. Muốn thì bạn cập nhật lại nhé."
            : null}
      </p>

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
        <div className="mt-3 flex flex-wrap gap-2">
          {canAnswer(worry.status) && (
            <button type="button" onClick={() => setMode("update")} className={btn.secondary}>
              Cập nhật
            </button>
          )}
          <button type="button" onClick={() => setMode("delete")} className={btn.ghost}>
            Xóa
          </button>
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
