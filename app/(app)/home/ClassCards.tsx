"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { joinChallenge } from "@/app/actions/challenges";
import { closeMyHelpRequest } from "@/app/actions/help";
import { HelpProgress } from "@/app/(app)/giup-do/HelpProgress";
import { UNREAD_EVENT } from "@/components/TabBar";
import { TO_LABEL, type HelpRequest } from "@/lib/help-requests-shared";

/** Lời đáp của thầy cô cho lời hẹn nói chuyện (hoặc nhắc là đang chờ). */
export function HelpReplyCard({ request: r }: { request: HelpRequest }) {
  const [closed, setClosed] = useState(false);
  const [pending, start] = useTransition();
  if (closed) return null;

  if (r.status === "new") {
    return (
      <section aria-label="Lời nhờ của bạn" className="space-y-3 rounded-[var(--radius-card)] bg-lilac px-5 py-4 text-sm">
        <p className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            🙋
          </span>
          <span>
            Bạn đã gửi lời nhờ cho <strong>{TO_LABEL[r.to_role].toLowerCase()}</strong>. Thầy cô sẽ trả lời bạn ở đây.
          </span>
        </p>
        <HelpProgress request={r} />
      </section>
    );
  }

  return (
    <section aria-label="Thầy cô trả lời" className="rounded-[var(--radius-card)] bg-lilac p-5">
      <p className="text-sm font-semibold">💬 {r.replied_by_name ?? "Thầy cô"} trả lời bạn</p>
      <div className="mt-2">
        <HelpProgress request={r} />
      </div>
      <p className="mt-2 font-display text-lg font-bold leading-snug tracking-tight">{r.reply}</p>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await closeMyHelpRequest(r.id);
            if (res.ok) {
              setClosed(true);
              window.dispatchEvent(new Event(UNREAD_EVENT));
            }
          })
        }
        className="mt-3 rounded-full bg-surface px-4 py-2 text-sm font-semibold"
      >
        Mình đã đọc
      </button>
    </section>
  );
}

/** Thử thách của lớp: tự nguyện, bấm Tham gia là thành một thói quen. */
export function ChallengeCard({
  challenge: c,
}: {
  challenge: { id: string; title: string; icon: string; description: string; author_name: string; joined: boolean; ends_on: string };
}) {
  const [joined, setJoined] = useState(c.joined);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [, m, d] = c.ends_on.split("-");

  return (
    <section aria-label="Thử thách của lớp" className="rounded-[var(--radius-card)] bg-mint p-5">
      <div className="flex items-start gap-3">
        <span className="text-4xl" aria-hidden>
          {c.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-muted">Thử thách của lớp · tới {Number(d)}/{Number(m)}</p>
          <h2 className="font-display text-xl font-bold leading-tight tracking-tight">{c.title}</h2>
          {c.description && (
            <p className="mt-1 text-sm">
              “{c.description}” <span className="text-muted">– {c.author_name}</span>
            </p>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
      {joined ? (
        <Link href="/habits" className="mt-3 inline-block rounded-full bg-surface px-4 py-2 text-sm font-semibold">
          ✓ Bạn đã tham gia · đánh dấu ở Thói quen
        </Link>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await joinChallenge(c.id);
              if (res.ok) setJoined(true);
              else setError(res.error);
            })
          }
          className="mt-3 rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-bg"
        >
          {pending ? "Đang tham gia…" : "Tham gia"}
        </button>
      )}
      <p className="mt-2 text-xs text-muted">Không bắt buộc, không xếp hạng. Thầy cô chỉ thấy số bạn tham gia, không thấy tên.</p>
    </section>
  );
}
