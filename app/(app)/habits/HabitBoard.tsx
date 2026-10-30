"use client";

import { useOptimistic, useState, useTransition } from "react";
import { archiveHabit, createHabit, restoreHabit, toggleHabitToday, updateHabitIcon } from "@/app/actions/habits";
import { May } from "@/components/mascot/May";
import { SpeechBubble } from "@/components/SpeechBubble";
import { ArchiveIcon, CheckIcon, PlusIcon } from "@/components/ui/icons";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { weekdayLabel } from "@/lib/dates";
import { HABIT_ICONS } from "@/lib/habit-icons";
import { IconPicker } from "./IconPicker";
import type { ArchivedHabit, HabitView } from "@/lib/habits";

const CARD_BG = ["bg-butter", "bg-sky", "bg-peach", "bg-lilac", "bg-mint"];
const SUGGESTIONS = [
  { icon: "📖", title: "Đọc 10 trang sách" },
  { icon: "💧", title: "Uống đủ 6 cốc nước" },
  { icon: "😴", title: "Ngủ trước 11 giờ" },
  { icon: "📵", title: "30 phút không điện thoại" },
];

export function HabitBoard({ habits, archived }: { habits: HabitView[]; archived: ArchivedHabit[] }) {
  // biểu tượng vừa đổi: hiện ngay, không chờ trang tải lại
  const [icons, setIcons] = useState<Record<string, string>>({});
  const withIcons = habits.map((h) => (icons[h.id] ? { ...h, icon: icons[h.id] } : h));
  const [optimistic, setDone] = useOptimistic(
    withIcons,
    (state, { id, done }: { id: string; done: boolean }) =>
      state.map((h) => (h.id === id ? { ...h, doneToday: done, daysDone: h.daysDone + (done ? 1 : -1) } : h)),
  );
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const setIcon = ({ id, icon }: { id: string; icon: string }) => setIcons((cur) => ({ ...cur, [id]: icon }));
  const [adding, setAdding] = useState(habits.length === 0);

  function toggle(h: HabitView) {
    const done = !h.doneToday;
    startTransition(async () => {
      setDone({ id: h.id, done });
      await toggleHabitToday(h.id, done);
    });
  }

  return (
    <div className="fm-stagger space-y-3">
      {optimistic.length === 0 && (
        <div className="flex items-end gap-3">
          <May size={90} mood="cheer" />
          <SpeechBubble className="mb-6">
            Bắt đầu bằng một thói quen thật nhỏ thôi. Nhỏ mà đều mới là bí quyết!
          </SpeechBubble>
        </div>
      )}

      {optimistic.map((h, i) => (
        <article key={h.id} className={cn("rounded-[var(--radius-card)] p-4 sm:p-5", CARD_BG[i % CARD_BG.length])}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEditing(editing === h.id ? null : h.id)}
              aria-expanded={editing === h.id}
              aria-label={`Đổi biểu tượng của ${h.title}`}
              title="Đổi biểu tượng"
              className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface/70 text-2xl transition hover:bg-surface"
            >
              {h.icon}
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-display text-lg font-bold tracking-tight">{h.title}</h2>
              <p className="flex items-center gap-1 text-sm text-muted">
                <CheckIcon size={15} strokeWidth={2.6} />
                {h.daysDone > 0 ? `Đã làm ${h.daysDone} ngày` : "Chưa làm ngày nào"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggle(h)}
              aria-pressed={h.doneToday}
              aria-label={h.doneToday ? `Bỏ đánh dấu ${h.title}` : `Đánh dấu đã làm ${h.title}`}
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-90",
                h.doneToday
                  ? "border-brand bg-brand text-brand-ink"
                  : "border-ink/20 bg-surface/60 text-transparent hover:border-brand hover:text-brand",
              )}
            >
              <CheckIcon size={24} strokeWidth={2.6} />
            </button>
          </div>

          {editing === h.id && (
            <EditIcon
              habitId={h.id}
              icon={h.icon}
              onDone={(icon) => {
                setEditing(null);
                if (icon) startTransition(() => setIcon({ id: h.id, icon }));
              }}
            />
          )}

          <div className="mt-4 flex items-center justify-between gap-1">
            {h.week.map((d, idx) => {
              const isToday = idx === 6;
              const done = isToday ? h.doneToday : d.done;
              return (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                  <span
                    className={cn(
                      "size-7 rounded-full transition",
                      done ? "bg-brand" : "bg-surface/60",
                      isToday && "ring-2 ring-ink/25 ring-offset-2 ring-offset-transparent",
                    )}
                  />
                  <span className="text-[11px] font-medium text-muted">{isToday ? "Nay" : weekdayLabel(d.day)}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-2 flex justify-end">
            <ArchiveButton id={h.id} title={h.title} />
          </div>
        </article>
      ))}

      {adding ? (
        <NewHabitForm onDone={() => setAdding(false)} canCancel={optimistic.length > 0} />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={cn(btn.secondary, "w-full py-4")}>
          <PlusIcon size={18} /> Thêm thói quen
        </button>
      )}

      {archived.length > 0 && <ArchivedList habits={archived} />}
    </div>
  );
}

function ArchiveButton({ id, title }: { id: string; title: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(`Lưu trữ thói quen "${title}"? Bạn xem lại và khôi phục được trong mục "Đã lưu trữ" ở cuối trang.`)) {
          startTransition(async () => {
            await archiveHabit(id);
          });
        }
      }}
      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-muted hover:bg-surface/60 hover:text-ink"
    >
      <ArchiveIcon size={14} /> Lưu trữ
    </button>
  );
}

/** Thói quen đã lưu trữ: xem lại số ngày đã làm và khôi phục. */
function ArchivedList({ habits }: { habits: ArchivedHabit[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <details className="group rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between font-display text-lg font-bold tracking-tight">
        <span className="flex items-center gap-2">
          <ArchiveIcon size={18} /> Đã lưu trữ ({habits.length})
        </span>
        <span className="text-sm font-medium text-muted group-open:hidden">Xem</span>
        <span className="hidden text-sm font-medium text-muted group-open:inline">Thu gọn</span>
      </summary>
      <ul className="mt-3 space-y-2">
        {habits.map((h) => (
          <li key={h.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2.5">
            <span className="text-xl" aria-hidden>
              {h.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{h.title}</span>
              <span className="block text-xs text-muted">{h.daysDone > 0 ? `Đã làm ${h.daysDone} ngày` : "Chưa làm ngày nào"}</span>
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const res = await restoreHabit(h.id);
                  if (!res.ok) setError(res.error);
                })
              }
              className={cn(btn.secondary, "px-4 py-2 text-sm")}
            >
              Khôi phục
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </details>
  );
}

function NewHabitForm({ onDone, canCancel }: { onDone: () => void; canCancel: boolean }) {
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState(HABIT_ICONS[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const res = await createHabit({ title, icon });
      if (res.ok) {
        setTitle("");
        onDone();
      } else setError(res.error);
    });
  }

  return (
    <form
      action={submit}
      className="rounded-[var(--radius-card)] border border-line bg-surface p-5"
    >
      <h2 className="font-display text-lg font-bold tracking-tight">Thói quen mới</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.title}
            type="button"
            onClick={() => {
              setTitle(s.title);
              setIcon(s.icon);
            }}
            className="rounded-full bg-surface-2 px-3 py-1.5 text-sm hover:bg-brand-soft"
          >
            {s.icon} {s.title}
          </button>
        ))}
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={60}
        required
        placeholder="VD: Đọc 10 trang sách"
        className={cn(input, "mt-3")}
        aria-label="Tên thói quen"
      />
      <div className="mt-4">
        <p className="mb-2 text-sm font-semibold">Biểu tượng</p>
        <IconPicker value={icon} onChange={setIcon} />
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-4 flex gap-2">
        {canCancel && (
          <button type="button" onClick={onDone} className={btn.secondary}>
            Hủy
          </button>
        )}
        <button type="submit" disabled={pending || !title.trim()} className={cn(btn.primary, "flex-1")}>
          {pending ? "Đang lưu…" : "Thêm"}
        </button>
      </div>
    </form>
  );
}

/** Đổi biểu tượng của một thói quen đã có. */
function EditIcon({ habitId, icon: initial, onDone }: { habitId: string; icon: string; onDone: (icon: string | null) => void }) {
  const [icon, setIcon] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="mt-4 rounded-3xl bg-surface/80 p-4">
      <p className="mb-2 text-sm font-semibold">Chọn biểu tượng mới</p>
      <IconPicker value={icon} onChange={setIcon} />
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={pending || icon === initial}
          onClick={() =>
            startTransition(async () => {
              const res = await updateHabitIcon(habitId, icon);
              if (res.ok) onDone(icon);
              else setError(res.error);
            })
          }
          className={cn(btn.primary, "px-5 py-2")}
        >
          {pending ? "Đang lưu…" : "Lưu biểu tượng"}
        </button>
        <button type="button" onClick={() => onDone(null)} className={btn.ghost}>
          Hủy
        </button>
      </div>
    </div>
  );
}
