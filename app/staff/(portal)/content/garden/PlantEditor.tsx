"use client";

import { useState } from "react";
import { deletePlant, savePlant } from "@/app/actions/admin";
import { StatusText, useAction } from "@/components/admin/AdminUI";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import type { Plant, Stage } from "@/lib/garden";

const NEW_STAGES: Stage[] = [
  { emoji: "🌰", label: "Hạt giống", points: 0 },
  { emoji: "🌱", label: "Nảy mầm", points: 3 },
  { emoji: "🌷", label: "Nở hoa", points: 15 },
];

export function PlantEditor({ plant }: { plant: (Plant & { active: boolean; sort_order: number; growing: number }) | null }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(plant?.name ?? "");
  const [active, setActive] = useState(plant?.active ?? true);
  const [stages, setStages] = useState<Stage[]>(plant?.stages ?? NEW_STAGES);
  const { pending, status, run } = useAction();

  if (!plant && !open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={cn(btn.secondary, "w-full py-4")}>
        + Thêm loại cây
      </button>
    );
  }

  const update = (i: number, patch: Partial<Stage>) => setStages(stages.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  return (
    <form
      action={() =>
        run(
          () => savePlant(plant?.id ?? null, { name, active, sort_order: plant?.sort_order ?? 100, stages }),
          plant ? "Đã lưu." : "Đã thêm cây.",
          () => {
            if (!plant) {
              setOpen(false);
              setName("");
              setStages(NEW_STAGES);
            }
          },
        )
      }
      className={cn("rounded-[var(--radius-card)] border border-line bg-surface p-5", !active && "opacity-70")}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-4xl" aria-hidden>
          {stages.at(-1)?.emoji}
        </span>
        <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Tên cây" aria-label="Tên cây" className={cn(input, "max-w-xs font-semibold")} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4 accent-[var(--brand)]" />
          Cho học sinh chọn
        </label>
        {plant && <span className="ml-auto text-sm text-muted">{plant.growing} học sinh đang trồng</span>}
      </div>

      <ol className="mt-4 flex flex-wrap items-stretch gap-2">
        {stages.map((s, i) => (
          <li key={i} className="flex w-36 flex-col gap-1.5 rounded-2xl bg-mint p-3">
            <div className="flex items-center gap-1">
              <input value={s.emoji} onChange={(e) => update(i, { emoji: e.target.value })} aria-label="Emoji" maxLength={8} className="w-12 rounded-xl bg-surface/70 px-1 py-1 text-center text-2xl outline-none" />
              {stages.length > 2 && (
                <button type="button" aria-label="Xóa giai đoạn" onClick={() => setStages(stages.filter((_, j) => j !== i))} className="ml-auto rounded-full px-2 text-muted hover:text-danger">
                  ×
                </button>
              )}
            </div>
            <input value={s.label} onChange={(e) => update(i, { label: e.target.value })} aria-label="Tên giai đoạn" className="rounded-xl bg-surface/70 px-2 py-1 text-sm outline-none" />
            <label className="flex items-center gap-1 text-xs text-muted">
              💧
              <input
                type="number"
                min={0}
                value={s.points}
                disabled={i === 0}
                onChange={(e) => update(i, { points: Number(e.target.value) })}
                aria-label="Số giọt nước"
                className="w-16 rounded-xl bg-surface/70 px-2 py-1 text-sm text-ink outline-none disabled:opacity-60"
              />
              giọt
            </label>
          </li>
        ))}
        {stages.length < 8 && (
          <li>
            <button
              type="button"
              onClick={() => setStages([...stages, { emoji: "🌳", label: "Giai đoạn mới", points: (stages.at(-1)?.points ?? 0) + 10 }])}
              className="flex h-full w-20 items-center justify-center rounded-2xl border-2 border-dashed border-line text-2xl text-muted hover:border-brand hover:text-brand"
              aria-label="Thêm giai đoạn"
            >
              +
            </button>
          </li>
        )}
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btn.primary}>
          {pending ? "Đang lưu…" : plant ? "Lưu" : "Thêm cây"}
        </button>
        {plant ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => confirm(`Xóa cây "${plant.name}"? Học sinh đang trồng sẽ được chuyển sang cây khác (giữ nguyên giọt nước).`) && run(() => deletePlant(plant.id), "Đã xóa.")}
            className={cn(btn.ghost, "text-danger hover:bg-danger-soft hover:text-danger")}
          >
            Xóa
          </button>
        ) : (
          <button type="button" onClick={() => setOpen(false)} className={btn.ghost}>
            Hủy
          </button>
        )}
        <StatusText status={status} />
      </div>
    </form>
  );
}
