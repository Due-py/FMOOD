"use client";

import { useOptimistic, useState, useTransition } from "react";
import { archiveHabit, createHabit, toggleHabitToday } from "@/app/actions/habits";
import { May } from "@/components/mascot/May";
import { SpeechBubble } from "@/components/SpeechBubble";
import { ArchiveIcon, CheckIcon, FlameIcon, PlusIcon } from "@/components/ui/icons";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { weekdayLabel } from "@/lib/dates";
import { HABIT_ICONS } from "@/lib/habit-icons";
import { restartLine } from "@/lib/mascot";
import { motion } from "motion/react";
import { celebrate } from "@/lib/celebrate";
import type { HabitView } from "@/lib/habits";

const CARD_BG = ["bg-butter", "bg-sky", "bg-peach", "bg-lilac", "bg-mint"];
const SUGGESTIONS = [
  { icon: "📖", title: "Đọc 10 trang sách" },
  { icon: "💧", title: "Uống đủ 6 cốc nước" },
  { icon: "😴", title: "Ngủ trước 11 giờ" },
  { icon: "📵", title: "30 phút không điện thoại" },
];

export function HabitBoard({ habits }: { habits: HabitView[] }) {
  const [optimistic, setDone] = useOptimistic(
    habits,
    (state, { id, done }: { id: string; done: boolean }) =>
      state.map((h) => (h.id === id ? { ...h, doneToday: done, streak: h.streak + (done ? 1 : -1) } : h)),
  );
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState(habits.length === 0);

  function toggle(h: HabitView, button: HTMLElement) {
    const done = !h.doneToday;
    if (done) celebrate(button, 40);
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
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface/70 text-2xl" aria-hidden>
              {h.icon}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-display text-lg font-bold tracking-tight">{h.title}</h2>
              <p className="flex items-center gap-1 text-sm text-muted">
                <FlameIcon size={15} className={h.streak > 0 ? "fm-flame text-orange-500" : ""} />
                {h.streak > 0 ? `Chuỗi ${h.streak} ngày` : "Chưa có chuỗi"}
                {h.best > 1 && <span className="ml-1">· Kỷ lục {h.best}</span>}
              </p>
            </div>
            <motion.button
              type="button"
              initial={false}
              animate={h.doneToday ? { scale: [1, 1.25, 0.95, 1], rotate: [0, -10, 6, 0] } : { scale: 1 }}
              transition={{ duration: 0.45 }}
              onClick={(e) => toggle(h, e.currentTarget)}
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
            </motion.button>
          </div>

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

          {h.broken && !h.doneToday && (
            <p className="mt-3 flex items-center gap-2 rounded-2xl bg-surface/70 px-3 py-2 text-sm">
              <span aria-hidden>☁️</span>
              {restartLine(h.title.length)}
            </p>
          )}

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
        if (confirm(`Cất thói quen "${title}" đi? Bạn có thể tạo lại bất cứ lúc nào.`)) {
          startTransition(async () => {
            await archiveHabit(id);
          });
        }
      }}
      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-muted hover:bg-surface/60 hover:text-ink"
    >
      <ArchiveIcon size={14} /> Cất đi
    </button>
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
      <div className="mt-3 grid grid-cols-6 gap-2" role="radiogroup" aria-label="Biểu tượng">
        {HABIT_ICONS.map((ic) => (
          <button
            key={ic}
            type="button"
            role="radio"
            aria-checked={icon === ic}
            onClick={() => setIcon(ic)}
            className={cn(
              "flex aspect-square items-center justify-center rounded-2xl text-xl transition",
              icon === ic ? "bg-brand-soft ring-2 ring-brand" : "bg-surface-2 hover:bg-line",
            )}
          >
            {ic}
          </button>
        ))}
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
