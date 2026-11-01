"use client";

import { motion } from "motion/react";
import { cn } from "@/components/ui/cn";
import { LEVEL_LABELS } from "@/lib/worries-shared";

/** Chọn mức lo 1–5 bằng thang thời tiết (dùng ở check-in, trò chuyện và lúc trợ lý hỏi lại). */
export function LevelPicker({ value, onChange, name = "level" }: { value: number | null; onChange: (level: number) => void; name?: string }) {
  return (
    <fieldset>
      <legend className="sr-only">Mức lo từ 1 đến 5</legend>
      <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
        {LEVEL_LABELS.map((label, i) => {
          const level = i + 1;
          const active = value === level;
          return (
            <label
              key={level}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-1 rounded-3xl border-2 px-1 pb-2 pt-3 text-center transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand/30",
                active ? "border-ink/70 bg-surface" : "border-transparent hover:bg-surface",
              )}
            >
              <input type="radio" name={name} value={level} checked={active} onChange={() => onChange(level)} className="sr-only" />
              <motion.span animate={active ? { y: [0, -5, 0] } : { y: 0 }} transition={{ duration: 0.4 }}>
                <WeatherCloud level={level} />
              </motion.span>
              <span className={cn("text-[11px] leading-tight sm:text-xs", active ? "font-bold" : "text-muted")}>{label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Thang mức lo dạng thời tiết (màu theo chế độ sáng / tối trong globals.css):
 * 1 mây trắng nắng to · 2 mây xanh nhạt nắng ló · 3 mây xám · 4 mây xám đậm mưa nhỏ · 5 mây đậm nhất mưa to.
 */
export function WeatherCloud({ level, className = "size-11 sm:size-14" }: { level: number; className?: string }) {
  const drops = level === 5 ? [14, 24, 34, 44] : level === 4 ? [20, 36] : [];
  return (
    <svg viewBox="0 0 60 56" className={className} aria-hidden>
      {/* biến màu CSS chỉ dùng được trong style, không dùng được trong thuộc tính fill / stroke */}
      {level === 1 && <circle cx="45" cy="13" r="8" style={{ fill: "var(--cloud-sun)" }} />}
      {level === 2 && <circle cx="46" cy="14" r="5" style={{ fill: "var(--cloud-sun)" }} />}
      <path
        d="M17 38a11 11 0 0 1-1.5-21.9A14 14 0 0 1 42 15.5 10 10 0 0 1 45 38Z"
        style={{ fill: `var(--cloud-${level})`, stroke: "var(--cloud-edge)" }}
        strokeWidth="1.5"
      />
      {drops.map((x) => (
        <line key={x} x1={x} y1="43" x2={x - 2} y2="51" style={{ stroke: "var(--cloud-rain)" }} strokeWidth="2.5" strokeLinecap="round" />
      ))}
    </svg>
  );
}
