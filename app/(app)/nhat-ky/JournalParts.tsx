"use client";

import { useState, useTransition } from "react";
import { journalWeekReview, type WeekReview } from "@/app/actions/journal";
import { useAssistant } from "@/components/mascot/AssistantContext";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

/** Lời báo riêng tư (ý 1 đã báo trước): thầy cô không đọc được, trừ khi có dấu hiệu nguy hiểm. */
export function PrivacyNote() {
  return (
    <p className="mt-2 max-w-2xl rounded-2xl bg-surface-2 px-4 py-3 text-sm">
      🔒 Nhật ký là của riêng bạn, thầy cô không đọc được. Chỉ khi có dấu hiệu bạn đang gặp nguy hiểm, F-Mood mới báo thầy cô để giúp
      bạn.
    </p>
  );
}

/** Ý 3 "Nhìn lại tuần": số liệu do app tự đếm, trợ lý viết vài dòng (trợ lý lỗi thì chỉ hiện số liệu). */
export function WeekReviewCard() {
  const { name } = useAssistant();
  const [review, setReview] = useState<WeekReview | null>(null);
  const [pending, start] = useTransition();

  return (
    <section className="rounded-[var(--radius-card)] bg-lilac p-5">
      <h2 className="font-display text-lg font-bold tracking-tight">Nhìn lại tuần</h2>
      {!review ? (
        <>
          <p className="mt-1 text-sm text-muted">
            {name} đọc tâm trạng và các trang 7 ngày qua của bạn, nhắc vài điều tốt và hỏi một câu cho tuần tới.
          </p>
          <button type="button" disabled={pending} onClick={() => start(async () => setReview(await journalWeekReview()))} className={cn(btn.secondary, "mt-3")}>
            {pending ? "Đang nhìn lại…" : `Nhìn lại tuần cùng ${name}`}
          </button>
        </>
      ) : !review.ok ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {review.error}
        </p>
      ) : (
        <div className="mt-2 space-y-3 text-sm">
          <ul className="space-y-1 text-muted">
            {review.facts.map((f) => (
              <li key={f}>• {f}</li>
            ))}
          </ul>
          {review.empty && <p>Tuần này chưa có gì để nhìn lại. Ghi tâm trạng hoặc viết một trang, tuần sau mình cùng xem nhé.</p>}
          {review.letter && (
            <div className="rounded-2xl bg-surface p-4">
              <p className="font-semibold">{name} thấy:</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {review.letter.good.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
              {review.letter.pattern && <p className="mt-2">{review.letter.pattern}</p>}
              <p className="mt-2 font-semibold">{review.letter.question}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
