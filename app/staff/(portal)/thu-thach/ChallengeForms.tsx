"use client";

import { useState, useTransition } from "react";
import { createChallenge, setChallengeOpen } from "@/app/actions/challenges";
import { useUndo } from "@/components/staff/Undo";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { HABIT_ICONS } from "@/lib/habit-icons";
import { classLabel } from "@/lib/class-tools";

const IDEAS: { title: string; icon: string }[] = [
  { title: "Uống đủ 6 cốc nước", icon: "💧" },
  { title: "Ngủ trước 22 giờ", icon: "😴" },
  { title: "Viết một điều biết ơn", icon: "✍️" },
  { title: "Đi bộ 15 phút", icon: "🏃" },
  { title: "Một giờ không điện thoại", icon: "📵" },
  { title: "Hít thở chậm 3 phút", icon: "🧘" },
];

export function ChallengeForm({ classes }: { classes: { id: string; name: string }[] }) {
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("💧");
  const [description, setDescription] = useState("");
  const [weeks, setWeeks] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const offerUndo = useUndo();

  return (
    <form
      className="space-y-4 rounded-[var(--radius-card)] border border-line bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await createChallenge({ classId, title, icon, description, weeks });
          if (!res.ok) return setError(res.error);
          offerUndo(`Đã bắt đầu thử thách “${title}”`, () => setChallengeOpen(res.id, false));
          setTitle("");
          setDescription("");
        });
      }}
    >
      <h2 className="font-display text-xl font-bold tracking-tight">Thử thách mới</h2>

      <div>
        <p className="mb-2 text-sm font-semibold">Chọn nhanh một ý</p>
        <div className="flex flex-wrap gap-2">
          {IDEAS.map((i) => (
            <button
              key={i.title}
              type="button"
              onClick={() => {
                setTitle(i.title);
                setIcon(i.icon);
              }}
              className={cn("rounded-full px-3 py-1.5 text-sm", title === i.title ? "bg-ink text-bg" : "bg-butter hover:brightness-95")}
            >
              {i.icon} {i.title}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Tên thử thách</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} required placeholder="VD: Uống đủ 6 cốc nước" className={input} />
      </label>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Biểu tượng</legend>
        <div className="flex flex-wrap gap-2">
          {HABIT_ICONS.map((i) => (
            <button
              key={i}
              type="button"
              aria-pressed={icon === i}
              aria-label={`Biểu tượng ${i}`}
              onClick={() => setIcon(i)}
              className={cn("flex size-11 items-center justify-center rounded-2xl text-xl", icon === i ? "bg-brand-soft ring-2 ring-brand" : "bg-surface-2")}
            >
              {i}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Lời nhắn cho lớp (không bắt buộc)</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
          placeholder="VD: Cả lớp mình cùng thử một tuần nhé!"
          className={input}
        />
      </label>

      <div className="flex flex-wrap gap-4">
        {classes.length > 1 && (
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Lớp</span>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className={input}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {classLabel(c.name)}
                </option>
              ))}
            </select>
          </label>
        )}
        <fieldset>
          <legend className="mb-1 text-sm font-semibold">Kéo dài</legend>
          <div className="flex gap-2">
            {([1, 2] as const).map((w) => (
              <button
                key={w}
                type="button"
                aria-pressed={weeks === w}
                onClick={() => setWeeks(w)}
                className={cn("rounded-full px-4 py-2.5 text-sm font-semibold", weeks === w ? "bg-ink text-bg" : "border border-line bg-surface")}
              >
                {w} tuần
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending || title.trim().length < 3} className={btn.primary}>
        {pending ? "Đang tạo…" : `Bắt đầu thử thách${classes.length === 1 ? ` cho ${classLabel(classes[0].name).replace(/^Lớp/, "lớp")}` : ""}`}
      </button>
    </form>
  );
}

/** "Kết thúc sớm" / "Mở lại", có Hoàn tác. */
export function ChallengeToggle({ id, title, open }: { id: string; title: string; open: boolean }) {
  const [pending, start] = useTransition();
  const offerUndo = useUndo();
  return (
    <button
      type="button"
      disabled={pending}
      className={cn(open ? btn.ghost : btn.secondary, open && "-ml-4 mt-2")}
      onClick={() =>
        start(async () => {
          const res = await setChallengeOpen(id, !open);
          if (!res.ok) return offerUndo(res.error);
          offerUndo(open ? `Đã kết thúc “${title}”` : `Đã mở lại “${title}”`, () => setChallengeOpen(id, open));
        })
      }
    >
      {open ? "Kết thúc sớm" : "Mở lại"}
    </button>
  );
}
