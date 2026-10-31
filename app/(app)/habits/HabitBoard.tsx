"use client";

import { useOptimistic, useState, useTransition } from "react";
import { archiveHabit, createHabit, restoreHabit, toggleHabitToday, updateHabitIcon } from "@/app/actions/habits";
import { CharacterAvatar } from "@/components/mascot/CharacterAvatar";
import { SpeechBubble } from "@/components/SpeechBubble";
import { ArchiveIcon, CheckIcon, PlusIcon } from "@/components/ui/icons";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { HABIT_ICONS } from "@/lib/habit-icons";
import { calendar, shortDate, sortForToday, STATUS_LABEL, summarize, type HabitStatus } from "@/lib/habits-shared";
import { IconPicker } from "./IconPicker";
import { HabitReview } from "./HabitReview";
import type { ArchivedHabit, HabitView } from "@/lib/habits";

// TRANG THÓI QUEN (làm lại 31/10, Duy đồng ý): mỗi thói quen một hàng gọn để nhìn nhanh nhiều thói quen;
// bấm vào hàng thì mở lịch 4 tuần (cột cố định T2…CN) và "Nhìn lại cùng trợ lý".
// Nền trung tính, màu chỉ để báo trạng thái; ngày chưa làm không tô đỏ, không có "chuỗi".

const SUGGESTIONS = [
  { icon: "📖", title: "Đọc 10 trang sách" },
  { icon: "💧", title: "Uống đủ 6 cốc nước" },
  { icon: "😴", title: "Ngủ trước 11 giờ" },
  { icon: "📵", title: "30 phút không điện thoại" },
];

const STATUS_TONE: Record<HabitStatus, string> = {
  steady: "bg-mint text-brand-strong dark:text-brand",
  regaining: "bg-sky text-ink",
  new: "bg-lilac text-ink",
};

const WEEK_HEAD = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function HabitBoard({ habits, archived }: { habits: HabitView[]; archived: ArchivedHabit[] }) {
  // biểu tượng vừa đổi: hiện ngay, không chờ trang tải lại
  const [icons, setIcons] = useState<Record<string, string>>({});
  const withIcons = habits.map((h) => (icons[h.id] ? { ...h, icon: icons[h.id] } : h));
  const [optimistic, setDone] = useOptimistic(withIcons, (state, { id, done }: { id: string; done: boolean }) =>
    state.map((h) =>
      h.id === id
        ? {
            ...h,
            doneToday: done,
            daysDone: h.daysDone + (done ? 1 : -1),
            total: h.total + (done ? 1 : -1),
            done: done ? [...h.done, h.today] : h.done.filter((d) => d !== h.today),
          }
        : h,
    ),
  );
  // thứ tự xếp lúc mở trang (chưa làm hôm nay lên đầu); đánh dấu xong không nhảy hàng dưới tay, lần sau mở trang mới xếp lại
  const [order] = useState(() => sortForToday(habits).map((h) => h.id));
  const rank = (id: string) => {
    const i = order.indexOf(id);
    return i === -1 ? order.length : i;
  };
  const list = [...optimistic].sort((a, b) => rank(a.id) - rank(b.id));
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState<string | null>(null);
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
      {list.length === 0 && (
        <div className="flex items-end gap-3">
          <CharacterAvatar size={90} mood="cheer" />
          <SpeechBubble className="mb-6">
            Bắt đầu bằng một thói quen thật nhỏ thôi. Nhỏ mà đều mới là bí quyết!
          </SpeechBubble>
        </div>
      )}

      {list.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
          {list.map((h) => (
            <HabitRow
              key={h.id}
              habit={h}
              open={open === h.id}
              onOpen={() => setOpen(open === h.id ? null : h.id)}
              onToggle={() => toggle(h)}
              onIcon={(icon) => startTransition(() => setIcon({ id: h.id, icon }))}
            />
          ))}
        </ul>
      )}

      {adding ? (
        <NewHabitForm onDone={() => setAdding(false)} canCancel={list.length > 0} />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={cn(btn.secondary, "w-full py-4")}>
          <PlusIcon size={18} /> Thêm thói quen
        </button>
      )}

      {archived.length > 0 && <ArchivedList habits={archived} />}
    </div>
  );
}

/** Một hàng: biểu tượng, tên, nhãn trạng thái + câu "Tuần này 3/7 · tuần trước 5/7", nút ✓ hôm nay. Bấm hàng để mở lịch. */
function HabitRow({
  habit: h,
  open,
  onOpen,
  onToggle,
  onIcon,
}: {
  habit: HabitView;
  open: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onIcon: (icon: string) => void;
}) {
  const s = summarize(h);
  const detailId = `habit-${h.id}`;
  return (
    <li className={cn("transition-colors", open && "bg-surface-2/60")}>
      <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
        <button
          type="button"
          onClick={onOpen}
          aria-expanded={open}
          aria-controls={detailId}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl text-left"
        >
          <span
            aria-hidden
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-2xl text-2xl transition",
              h.doneToday ? "bg-brand-soft" : "bg-surface-2",
            )}
          >
            {h.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-[17px] font-bold leading-tight tracking-tight">{h.title}</span>
            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
              {s.status && (
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_TONE[s.status])}>{STATUS_LABEL[s.status]}</span>
              )}
              <span>{s.line}</span>
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={h.doneToday}
          aria-label={h.doneToday ? `Bỏ đánh dấu hôm nay: ${h.title}` : `Đánh dấu hôm nay đã làm: ${h.title}`}
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-90",
            h.doneToday
              ? "border-brand bg-brand text-brand-ink"
              : "border-ink/20 bg-surface text-transparent hover:border-brand hover:text-brand",
          )}
        >
          <CheckIcon size={22} strokeWidth={2.6} />
        </button>
      </div>
      {open && <HabitDetail id={detailId} habit={h} onIcon={onIcon} />}
    </li>
  );
}

/** Lịch 4 tuần (hàng = tuần, cột T2…CN, số ngày mỗi tuần) và các việc với thói quen này. */
function HabitDetail({ id, habit: h, onIcon }: { id: string; habit: HabitView; onIcon: (icon: string) => void }) {
  const weeks = calendar(h);
  const [editing, setEditing] = useState(false);
  return (
    <div id={id} data-habit-detail className="space-y-4 px-3 pb-4 sm:px-4">
      <div className="rounded-3xl bg-surface p-3 sm:p-5">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h3 className="font-display text-base font-bold tracking-tight">4 tuần gần đây</h3>
          <span className="text-xs text-muted">Bắt đầu {shortDate(h.startDay)}</span>
        </div>
        <table className="w-full table-fixed border-separate border-spacing-1 text-center sm:max-w-xl">
          <caption className="sr-only">Những ngày đã làm “{h.title}” trong 4 tuần gần đây</caption>
          <thead>
            <tr className="text-[11px] font-semibold text-muted">
              <th scope="col" className="w-[4.25rem] text-left font-semibold sm:w-24">
                <span className="sr-only">Tuần</span>
              </th>
              {WEEK_HEAD.map((d) => (
                <th key={d} scope="col" className="font-semibold">
                  {d}
                </th>
              ))}
              <th scope="col" className="w-12 whitespace-nowrap font-semibold sm:w-16">
                Số ngày
              </th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.monday}>
                <th scope="row" className="truncate text-left text-xs font-medium text-muted">
                  {w.label}
                </th>
                {w.days.map((d) => (
                  <td key={d.day} className="p-0">
                    <span
                      title={`${shortDate(d.day)}${d.state === "done" ? ": đã làm" : ""}`}
                      className={cn(
                        "mx-auto flex aspect-square w-full max-w-9 items-center justify-center rounded-xl text-[11px] font-semibold tabular-nums",
                        d.state === "done" && "bg-brand text-brand-ink",
                        d.state === "open" && "bg-surface-2 text-muted",
                        d.state === "before" && "text-muted/50",
                        d.state === "future" && "border border-dashed border-line text-muted/50",
                        d.today && "ring-2 ring-ink/30 ring-offset-1 ring-offset-surface",
                      )}
                    >
                      {Number(d.day.slice(8))}
                      <span className="sr-only">{d.state === "done" ? " đã làm" : d.state === "future" ? " chưa tới" : ""}</span>
                    </span>
                  </td>
                ))}
                <td className="text-sm font-bold tabular-nums">
                  {w.count}
                  <span className="sr-only"> ngày</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded bg-brand" /> Đã làm
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded bg-surface-2 ring-1 ring-line" /> Chưa làm
          </span>
          <span>Từ khi bắt đầu: {h.total} ngày</span>
        </p>
      </div>

      <HabitReview habitId={h.id} />

      <div className="flex flex-wrap items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => setEditing(!editing)}
          aria-expanded={editing}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-muted hover:bg-surface hover:text-ink"
        >
          <span aria-hidden>{h.icon}</span> Đổi biểu tượng
        </button>
        <ArchiveButton id={h.id} title={h.title} />
      </div>
      {editing && (
        <EditIcon
          habitId={h.id}
          icon={h.icon}
          onDone={(icon) => {
            setEditing(false);
            if (icon) onIcon(icon);
          }}
        />
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
        if (confirm(`Lưu trữ thói quen "${title}"? Bạn xem lại và khôi phục được trong mục "Đã lưu trữ" ở cuối trang.`)) {
          startTransition(async () => {
            await archiveHabit(id);
          });
        }
      }}
      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-muted hover:bg-surface hover:text-ink"
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
    <div className="rounded-3xl bg-surface p-4">
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
