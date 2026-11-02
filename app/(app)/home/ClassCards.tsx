"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { joinChallenge } from "@/app/actions/challenges";
import { closeMyHelpRequest } from "@/app/actions/help";
import { HelpProgress } from "@/app/(app)/giup-do/HelpProgress";
import { UNREAD_EVENT } from "@/components/TabBar";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { TO_LABEL, type HelpRequest } from "@/lib/help-requests-shared";

/** Nút trắng cùng dáng nút chính (viền nghệ, bóng dưới đáy, bấm thì lún), đặt trên nền pastel. */
const BTN_WHITE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-brand-edge bg-surface px-5 py-2 text-sm font-bold text-ink shadow-[0_3px_0_var(--brand-edge)] transition duration-200 hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0_1px_0_var(--brand-edge)] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none";

/** Lời đáp của thầy cô cho lời hẹn nói chuyện (hoặc nhắc là đang chờ). */
export function HelpReplyCard({ request: r }: { request: HelpRequest }) {
  const [closed, setClosed] = useState(false);
  const [pending, start] = useTransition();
  if (closed) return null;

  if (r.status === "new") {
    return (
      <section aria-label="Lời nhờ của bạn" className="space-y-3 rounded-[24px] bg-c1 px-4 py-4 text-sm sm:px-[18px]">
        <p className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 -rotate-6 items-center justify-center rounded-2xl bg-surface text-2xl" aria-hidden>
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
    <section aria-label="Thầy cô trả lời" className="rounded-[26px] bg-c1 px-4 py-4 sm:px-[18px]">
      <p className="text-sm font-bold text-c1-ink">
        <span aria-hidden>💬 </span>
        {r.replied_by_name ?? "Thầy cô"} trả lời bạn
      </p>
      <div className="mt-2.5">
        <HelpProgress request={r} />
      </div>
      <p className="mt-3 rounded-[22px_22px_22px_6px] bg-surface px-4 py-3 font-display text-[19px] font-bold leading-snug">{r.reply}</p>
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
        className={cn(BTN_WHITE, "mt-3")}
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
    <section aria-label="Thử thách của lớp" className="rounded-[24px] bg-c2 p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-[52px] shrink-0 -rotate-[5deg] items-center justify-center rounded-[18px] bg-surface text-[28px]" aria-hidden>
          {c.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-c2-ink">Thử thách của lớp · tới {Number(d)}/{Number(m)}</p>
          <h2 className="font-display text-xl font-bold leading-tight">{c.title}</h2>
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
        <Link href="/habits" className={cn(BTN_WHITE, "mt-3")}>
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
          className={cn(btn.primary, "mt-3 px-5")}
        >
          {pending ? "Đang tham gia…" : "Tham gia nè"}
        </button>
      )}
      <p className="mt-2.5 text-xs text-muted">Không bắt buộc, không xếp hạng. Thầy cô chỉ thấy số bạn tham gia, không thấy tên.</p>
    </section>
  );
}
