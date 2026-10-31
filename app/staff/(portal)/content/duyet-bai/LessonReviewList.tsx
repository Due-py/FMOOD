"use client";

import { useState } from "react";
import Markdown from "react-markdown";
import { setLessonReviewed, setLessonSource } from "@/app/actions/lesson-review";
import { StatusText, useAction } from "@/components/admin/AdminUI";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import type { ReviewLesson } from "@/lib/lesson-review";
import { EMPTY_FILTER, filterLessons, filterOptions, isFiltering, type LessonFilter } from "@/lib/lesson-review-filter";

/** Số bài hiện mỗi lần (bấm "Xem thêm" để hiện tiếp), cho trang không quá dài khi có nhiều bài. */
const PAGE = 20;

const DATE = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });

/**
 * Hai danh sách: chưa duyệt / đã duyệt, có bộ lọc (tìm, lớp, chủ đề, nguồn, loại bài, đăng) và hiện từng 20 bài.
 * Mỗi bài đọc được ngay tại đây, sửa nguồn, đánh dấu đã duyệt.
 */
export function LessonReviewList({ items, ready, initialTab }: { items: ReviewLesson[]; ready: boolean; initialTab: "pending" | "reviewed" }) {
  const [tab, setTab] = useState(initialTab);
  const [filter, setFilter] = useState<LessonFilter>(EMPTY_FILTER);
  const [shown, setShown] = useState(PAGE);
  const options = filterOptions(items);
  const matched = filterLessons(items, filter);
  const pending = matched.filter((l) => !l.reviewed_at);
  const reviewed = matched.filter((l) => l.reviewed_at);
  const list = tab === "pending" ? pending : reviewed;
  const set = (patch: Partial<LessonFilter>) => {
    setFilter((f) => ({ ...f, ...patch }));
    setShown(PAGE);
  };
  const select = "rounded-full border border-line bg-surface px-3 py-2 text-sm";

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
            onClick={() => {
              setTab(key);
              setShown(PAGE);
            }}
            className={cn("rounded-full px-4 py-2 text-sm font-semibold", tab === key ? "bg-ink text-bg" : "border border-line bg-surface")}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface-2 p-3" role="search" aria-label="Lọc bài">
        <input
          value={filter.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="Tìm tên bài hoặc nội dung…"
          aria-label="Tìm bài"
          className={cn(input, "min-w-0 flex-1 basis-56")}
        />
        <select value={filter.grade} onChange={(e) => set({ grade: e.target.value })} aria-label="Lớp" className={select}>
          <option value="">Mọi lớp</option>
          {options.grades.map((g) => (
            <option key={g} value={g}>
              Lớp {g}
            </option>
          ))}
          {options.hasUngraded && <option value="chung">Không gắn lớp</option>}
        </select>
        <select value={filter.topic} onChange={(e) => set({ topic: e.target.value })} aria-label="Chủ đề" className={select}>
          <option value="">Mọi chủ đề</option>
          {options.topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select value={filter.source} onChange={(e) => set({ source: e.target.value as LessonFilter["source"] })} aria-label="Nguồn" className={select}>
          <option value="">Mọi nguồn</option>
          <option value="co">Đã ghi nguồn</option>
          <option value="chua">Chưa ghi nguồn</option>
        </select>
        <select value={filter.kind} onChange={(e) => set({ kind: e.target.value as LessonFilter["kind"] })} aria-label="Loại bài" className={select}>
          <option value="">Mọi loại bài</option>
          <option value="chung">Bài chung</option>
          <option value="gvcn">Bài GVCN soạn</option>
        </select>
        <select value={filter.published} onChange={(e) => set({ published: e.target.value as LessonFilter["published"] })} aria-label="Đăng" className={select}>
          <option value="">Đã đăng và chưa đăng</option>
          <option value="da">Đã đăng</option>
          <option value="chua">Chưa đăng</option>
        </select>
        {isFiltering(filter) && (
          <button type="button" onClick={() => set(EMPTY_FILTER)} className={cn(btn.ghost, "px-3 py-2 text-sm")}>
            Bỏ lọc
          </button>
        )}
      </div>
      <p className="text-sm text-muted" aria-live="polite">
        {isFiltering(filter) ? `Khớp bộ lọc: ${matched.length} / ${items.length} bài. ` : ""}
        Đang hiện {Math.min(shown, list.length)} / {list.length} bài {tab === "pending" ? "chưa duyệt" : "đã duyệt"}.
      </p>
      {list.length === 0 && (
        <p className="text-sm text-muted">
          {isFiltering(filter) ? "Không có bài nào khớp bộ lọc." : tab === "pending" ? "Không còn bài nào chờ duyệt." : "Chưa duyệt bài nào."}
        </p>
      )}
      <ul className="space-y-3">
        {list.slice(0, shown).map((l) => (
          <li key={l.id}>
            <LessonRow lesson={l} ready={ready} />
          </li>
        ))}
      </ul>
      {list.length > shown && (
        <button type="button" onClick={() => setShown((n) => n + PAGE)} className={cn(btn.secondary, "w-full")}>
          Xem thêm {Math.min(PAGE, list.length - shown)} bài (còn {list.length - shown})
        </button>
      )}
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
