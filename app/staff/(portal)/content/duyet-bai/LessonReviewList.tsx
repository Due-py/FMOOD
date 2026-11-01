"use client";

import { useState } from "react";
import Markdown from "react-markdown";
import { reviewAllAssigned, setLessonReviewed, setLessonSel, setLessonSource } from "@/app/actions/lesson-review";
import { StatusText, useAction } from "@/components/admin/AdminUI";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import type { ReviewLesson } from "@/lib/lesson-review";
import { EMPTY_FILTER, filterLessons, filterOptions, isFiltering, type LessonFilter } from "@/lib/lesson-review-filter";
import { CASEL_SUGGESTIONS, type LessonCasel } from "@/lib/lesson-casel";
import { CASEL, CASEL5, SUBSKILLS, visibleItems, type Casel } from "@/lib/sel/casel";

/** Số bài hiện mỗi lần (bấm "Xem thêm" để hiện tiếp), cho trang không quá dài khi có nhiều bài. */
const PAGE = 20;

const DATE = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });

/**
 * Duyệt một lần mọi bài đã đăng, đã gắn CASEL, ghi tên người bấm (bài người khác đã duyệt cũng ghi lại tên người này).
 * Hỏi xác nhận trước vì tên người bấm hiện ở cuối từng bài cho học sinh thấy.
 */
function ReviewAllBar({ count }: { count: number }) {
  const { pending, status, setStatus, run } = useAction();
  if (!count) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-sm">
      <p className="min-w-0 flex-1 basis-64">
        Đã đọc hết các bài? Duyệt một lần <strong>{count} bài đã đăng, đã gắn năng lực CASEL 5</strong>, ghi tên bạn là người duyệt.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Bạn xác nhận đã đọc ${count} bài và cho hiện với học sinh? Tên bạn sẽ ghi là người duyệt ở cuối từng bài.`)) return;
          run(reviewAllAssigned, "Đã duyệt.", (r) => setStatus({ ok: true, text: `Đã duyệt ${r.count ?? 0} bài dưới tên bạn.` }));
        }}
        className={cn(btn.primary, "px-4 py-2 text-sm")}
      >
        Duyệt tất cả dưới tên mình
      </button>
      <StatusText status={status} />
    </div>
  );
}

/**
 * Hai danh sách: chưa duyệt / đã duyệt, có bộ lọc (tìm, lớp, chủ đề, nguồn, loại bài, đăng) và hiện từng 20 bài.
 * Mỗi bài đọc được ngay tại đây, sửa nguồn, đánh dấu đã duyệt.
 */
export function LessonReviewList({
  items,
  ready,
  caselReady,
  initialTab,
}: {
  items: ReviewLesson[];
  ready: boolean;
  caselReady: boolean;
  initialTab: "pending" | "reviewed";
}) {
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
      {ready && caselReady && <ReviewAllBar count={items.filter((l) => l.published && l.casel_primary).length} />}
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
            <LessonRow lesson={l} ready={ready} caselReady={caselReady} />
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

function LessonRow({ lesson: l, ready, caselReady }: { lesson: ReviewLesson; ready: boolean; caselReady: boolean }) {
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
          {CASEL_SUGGESTIONS[l.slug]?.priority && <p className="mt-1 text-xs font-semibold text-brand-strong">Bài ưu tiên cho lớp 8 (kế hoạch V2, mục 5)</p>}
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

      <CaselEditor lesson={l} ready={caselReady} />

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

/**
 * Gắn khung CASEL cho bài (0026): năng lực chính, liên quan, mã kỹ năng thành phần 2020, kỹ năng có bài luyện, một mục tiêu.
 * Bài ưu tiên có nút "Điền gợi ý" (kế hoạch V2 mục 5): chỉ điền sẵn vào ô, người duyệt sửa rồi bấm Lưu.
 * Học sinh chỉ thấy bài ở trang Kỹ năng khi bài đã đăng, đã duyệt và đã có năng lực chính.
 */
function CaselEditor({ lesson: l, ready }: { lesson: ReviewLesson; ready: boolean }) {
  const [v, setV] = useState<LessonCasel>({
    casel_primary: l.casel_primary,
    casel_related: l.casel_related ?? [],
    casel_items: l.casel_items ?? [],
    subskill: l.subskill,
    learning_objective: l.learning_objective,
  });
  const { pending, status, run } = useAction();
  const suggestion = CASEL_SUGGESTIONS[l.slug];
  const shownCompetencies = CASEL5.filter((c) => c === v.casel_primary || v.casel_related.includes(c));
  const toggle = (list: string[], x: string) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);
  const select = "rounded-xl border border-line bg-surface px-3 py-2 text-sm";

  if (!ready) {
    return (
      <p className="mt-3 rounded-2xl bg-surface-2 p-3 text-sm text-muted">
        Gắn khung CASEL: cần chạy <code>supabase/migrations/0026_casel_ky_nang.sql</code> trước.
      </p>
    );
  }
  return (
    <details className="mt-3 rounded-2xl border border-line p-3 text-sm" open={Boolean(l.casel_primary)}>
      <summary className="cursor-pointer font-semibold">
        Năng lực CASEL 5 {l.casel_primary ? `· ${CASEL[l.casel_primary].name}` : "· chưa gắn (học sinh chưa thấy bài ở trang Luyện kỹ năng)"}
      </summary>
      <form className="mt-3 space-y-3" action={() => run(() => setLessonSel(l.id, { ...v, learning_objective: v.learning_objective ?? "" }), "Đã lưu năng lực CASEL 5.")}>
        {suggestion && (
          <button type="button" onClick={() => setV({ ...suggestion })} className={cn(btn.secondary, "px-4 py-2 text-sm")}>
            Điền gợi ý (sửa được trước khi lưu)
          </button>
        )}
        <label className="block">
          <span className="font-semibold">Năng lực chính</span>
          <select
            value={v.casel_primary ?? ""}
            onChange={(e) => {
              const p = (e.target.value || null) as Casel | null;
              setV((x) => ({ ...x, casel_primary: p, casel_related: x.casel_related.filter((c) => c !== p) }));
            }}
            className={cn(select, "mt-1 block w-full")}
          >
            <option value="">Chọn một năng lực</option>
            {CASEL5.map((c) => (
              <option key={c} value={c}>
                {CASEL[c].name}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend className="font-semibold">Năng lực liên quan (tùy chọn)</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {CASEL5.filter((c) => c !== v.casel_primary).map((c) => (
              <label key={c} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5">
                <input
                  type="checkbox"
                  checked={v.casel_related.includes(c)}
                  onChange={() => setV((x) => ({ ...x, casel_related: toggle(x.casel_related, c) as Casel[] }))}
                />
                {CASEL[c].name}
              </label>
            ))}
          </div>
        </fieldset>
        {shownCompetencies.length > 0 && (
          <fieldset>
            <legend className="font-semibold">Kỹ năng thành phần (khung CASEL 5, bản 2020) bài này rèn</legend>
            <div className="mt-1 space-y-2">
              {shownCompetencies.map((c) => (
                <div key={c}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{CASEL[c].name}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {visibleItems(c).map((i) => (
                      <label key={i.code} className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1">
                        <input
                          type="checkbox"
                          checked={v.casel_items.includes(i.code)}
                          onChange={() => setV((x) => ({ ...x, casel_items: toggle(x.casel_items, i.code) }))}
                        />
                        {i.vi}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
        )}
        <label className="block">
          <span className="font-semibold">Nối với bài luyện (tùy chọn; có thì hiện nút Luyện cùng AI ở cuối bài)</span>
          <select
            value={v.subskill ?? ""}
            onChange={(e) => setV((x) => ({ ...x, subskill: (e.target.value || null) as LessonCasel["subskill"] }))}
            className={cn(select, "mt-1 block w-full")}
          >
            <option value="">Không nối (chỉ đọc và suy ngẫm)</option>
            {SUBSKILLS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="font-semibold">Mục tiêu học tập (một câu, quan sát được)</span>
          <input
            value={v.learning_objective ?? ""}
            onChange={(e) => setV((x) => ({ ...x, learning_objective: e.target.value }))}
            maxLength={300}
            placeholder="Ví dụ: Viết lại một nỗi lo về giờ học thành một câu thực tế hơn."
            className={cn(input, "mt-1")}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending || !v.casel_primary} className={cn(btn.primary, "px-5 py-2")}>
            {pending ? "Đang lưu…" : "Lưu năng lực CASEL 5"}
          </button>
          <StatusText status={status} />
        </div>
      </form>
    </details>
  );
}
