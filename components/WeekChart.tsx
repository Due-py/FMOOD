"use client";

import { useState } from "react";
import { GROUP_COLOR, GROUP_LABEL, type EmotionGroup } from "@/lib/emotions";
import { cn } from "@/components/ui/cn";

export type WeekDatum = { day: string; label: string } & Record<EmotionGroup, number>;

// thứ tự chồng từ dưới lên, cố định
const GROUPS: EmotionGroup[] = ["positive", "neutral", "negative"];
const CHART_HEIGHT = 140;

/** Biểu đồ cột chồng: số lần chọn cảm xúc mỗi nhóm trong 7 ngày qua. */
export function WeekChart({ data }: { data: WeekDatum[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const max = Math.max(1, ...data.map((d) => d.positive + d.neutral + d.negative));
  const totals = GROUPS.map((g) => ({ g, n: data.reduce((s, d) => s + d[g], 0) }));
  const empty = totals.every((t) => t.n === 0);

  return (
    <div>
      {/* chú thích luôn hiện, kèm tổng 7 ngày */}
      <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {totals.map(({ g, n }) => (
          <li key={g} className="flex items-center gap-1.5 text-muted">
            <span className="size-2.5 rounded-sm" style={{ background: GROUP_COLOR[g] }} />
            {GROUP_LABEL[g]} <span className="font-semibold text-ink">{n}</span>
          </li>
        ))}
      </ul>

      {empty ? (
        <p className="rounded-2xl bg-surface-2 p-6 text-center text-sm text-muted">
          Chưa có check-in nào trong 7 ngày qua.
        </p>
      ) : (
        <div className="relative" onMouseLeave={() => setActive(null)}>
          <div className="flex items-end gap-2 border-b border-line" style={{ height: CHART_HEIGHT }}>
            {data.map((d, i) => {
              const total = d.positive + d.neutral + d.negative;
              return (
                <button
                  key={d.day}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  aria-label={`${d.label}: ${GROUPS.map((g) => `${GROUP_LABEL[g]} ${d[g]}`).join(", ")}`}
                  className="flex h-full flex-1 flex-col-reverse items-center outline-none"
                >
                  {/* vùng bấm rộng hơn cột */}
                  <span
                    className={cn(
                      "flex w-full max-w-7 flex-col-reverse gap-0.5 transition-opacity",
                      active !== null && active !== i && "opacity-50",
                    )}
                    style={{ height: `${(total / max) * 100}%` }}
                  >
                    {GROUPS.filter((g) => d[g] > 0).map((g, idx, arr) => (
                      <span
                        key={g}
                        className={cn("w-full", idx === arr.length - 1 && "rounded-t")}
                        style={{ flexGrow: d[g], flexBasis: 0, background: GROUP_COLOR[g], minHeight: 3 }}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-1.5 flex gap-2">
            {data.map((d, i) => (
              <span
                key={d.day}
                className={cn("flex-1 text-center text-[11px] font-medium", i === data.length - 1 ? "text-ink" : "text-muted")}
              >
                {d.label}
              </span>
            ))}
          </div>

          {active !== null && (
            <div
              role="status"
              className="pointer-events-none absolute top-0 z-10 w-40 -translate-x-1/2 rounded-2xl border border-line bg-surface p-3 text-sm shadow-lg"
              style={{ left: `${Math.min(Math.max(((active + 0.5) / data.length) * 100, 22), 78)}%` }}
            >
              <p className="mb-1 font-semibold">{data[active].label === "Nay" ? "Hôm nay" : data[active].label}</p>
              {GROUPS.map((g) => (
                <p key={g} className="flex items-center justify-between gap-2 text-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-sm" style={{ background: GROUP_COLOR[g] }} />
                    {GROUP_LABEL[g]}
                  </span>
                  <span className="font-semibold text-ink">{data[active][g]}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {!empty && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowTable(!showTable)}
            className="text-sm font-semibold text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            {showTable ? "Ẩn bảng số liệu" : "Xem dạng bảng"}
          </button>
          {showTable && (
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="py-1 font-medium">Ngày</th>
                  {GROUPS.map((g) => (
                    <th key={g} className="py-1 text-right font-medium">
                      {GROUP_LABEL[g]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.day} className="border-t border-line">
                    <td className="py-1.5">{d.label === "Nay" ? "Hôm nay" : d.label}</td>
                    {GROUPS.map((g) => (
                      <td key={g} className="py-1.5 text-right tabular-nums">
                        {d[g]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
