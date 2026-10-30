"use client";

import { useState } from "react";
import Markdown from "react-markdown";
import { setLessonReviewed, setLessonSource } from "@/app/actions/lesson-review";
import { StatusText, useAction } from "@/components/admin/AdminUI";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import type { ReviewLesson } from "@/lib/lesson-review";

const DATE = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });

/** Hai danh sách: chưa duyệt / đã duyệt. Mỗi bài đọc được ngay tại đây, sửa nguồn, đánh dấu đã duyệt. */
export function LessonReviewList({ items, ready, initialTab }: { items: ReviewLesson[]; ready: boolean; initialTab: "pending" | "reviewed" }) {
  const [tab, setTab] = useState(initialTab);
  const pending = items.filter((l) => !l.reviewed_at);
  const reviewed = items.filter((l) => l.reviewed_at);
  const list = tab === "pending" ? pending : reviewed;

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Trạng thái duyệt" className="flex flex-wrap gap-2">
        {(
          [
            ["pending", `Chưa duyệt (${pending.length})`],
            ["reviewed", `Đã duyệt (${reviewed.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn("rounded-full px-4 py-2 text-sm font-semibold", tab === key ? "bg-ink text-bg" : "border border-line bg-surface")}
          >
            {label}
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="text-sm text-muted">{tab === "pending" ? "Không còn bài nào chờ duyệt." : "Chưa duyệt bài nào."}</p>}
      <ul className="space-y-3">
        {list.map((l) => (
          <li key={l.id}>
            <LessonRow lesson={l} ready={ready} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function LessonRow({ lesson: l, ready }: { lesson: ReviewLesson; ready: boolean }) {
  const [source, setSource] = useState(l.source);
  const [editing, setEditing] = useState(false);
  const { pending, status, run } = useAction();

  return (
    <article className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start gap-3">
        <span className="text-2xl" aria-hidden>
          {l.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold leading-snug tracking-tight">{l.title}</h3>
          <p className="text-xs text-muted">
            {l.grade ? `Lớp ${l.grade} · ` : ""}
            {l.topic}
            {l.author_name ? ` · bài của ${l.author_name}` : ""}
            {!l.published && " · chưa đăng"}
          </p>
          <p className="mt-1 text-sm">
            {l.reviewed_at ? (
              <span className="rounded-full bg-mint px-2.5 py-0.5 font-semibold">
                ✓ Đã duyệt: {l.reviewed_by_name ?? "thầy cô"}, {DATE.format(new Date(l.reviewed_at))}
              </span>
            ) : (
              <span className="rounded-full bg-butter px-2.5 py-0.5 font-semibold">Chưa duyệt</span>
            )}
          </p>
        </div>
      </div>

      <div className="mt-3 text-sm">
        {editing ? (
          <form
            className="flex flex-wrap items-center gap-2"
            action={() => run(() => setLessonSource(l.id, source), "Đã lưu nguồn.", () => setEditing(false))}
          >
            <input value={source} onChange={(e) => setSource(e.target.value)} maxLength={300} aria-label="Nguồn của bài" className={cn(input, "min-w-0 flex-1")} />
            <button type="submit" disabled={pending} className={cn(btn.primary, "px-4 py-2")}>
              Lưu
            </button>
            <button type="button" onClick={() => setEditing(false)} className={btn.ghost}>
              Hủy
            </button>
          </form>
        ) : (
          <p>
            <span className="text-muted">Nguồn: </span>
            {l.source || <em className="text-danger">chưa ghi nguồn</em>}
            <button type="button" onClick={() => setEditing(true)} className="ml-2 font-semibold underline underline-offset-2">
              Sửa
            </button>
          </p>
        )}
      </div>

      <details className="mt-3 rounded-2xl bg-surface-2 p-3 text-sm">
        <summary className="cursor-pointer font-semibold">Đọc bài{l.exercises.length ? ` và ${l.exercises.length} bài tập` : ""}</summary>
        <div className="prose-sm mt-3 space-y-2 [&_li]:ml-4 [&_li]:list-disc">
          <Markdown>{l.body}</Markdown>
        </div>
        {l.exercises.length > 0 && (
          <ol className="mt-3 list-decimal space-y-1 pl-5">
            {l.exercises.map((e) => (
              <li key={e.id}>{e.prompt}</li>
            ))}
          </ol>
        )}
      </details>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {l.reviewed_at ? (
          <button type="button" disabled={pending || !ready} onClick={() => run(() => setLessonReviewed(l.id, false), "Đã bỏ duyệt.")} className={btn.ghost}>
            Bỏ duyệt
          </button>
        ) : (
          <button
            type="button"
            disabled={pending || !ready}
            onClick={() => run(() => setLessonReviewed(l.id, true), "Đã đánh dấu đã duyệt.")}
            className={cn(btn.primary, "px-5 py-2")}
          >
            {pending ? "Đang lưu…" : "Đã đọc, đánh dấu đã duyệt"}
          </button>
        )}
        <StatusText status={status} />
      </div>
    </article>
  );
}
