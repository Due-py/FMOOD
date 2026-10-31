// Icon nhóm tâm trạng 1–5 theo mẫu Duy gửi (01/11): hình thời tiết cho chú thích, lịch, check-in; mặt cười cho trục biểu đồ.
// Màu theo biến --mood-1…5 (app/globals.css), đổi theo chế độ sáng / tối. Luôn đi kèm chữ (label) ở nơi hiện cho học sinh.
import { cn } from "@/components/ui/cn";
import { moodLevel } from "@/lib/mood";

const c = (level: number) => `var(--mood-${Math.min(5, Math.max(1, Math.round(level)))})`;

/** Hình thời tiết: 5 nắng · 4 nắng có mây · 3 mây · 2 ô gập · 1 ô có mưa. */
export function WeatherIcon({ level, size = 24, className }: { level: number; size?: number; className?: string }) {
  const lv = Math.min(5, Math.max(1, Math.round(level)));
  const col = c(lv);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      {lv === 5 && (
        <g stroke={col} strokeWidth={1.8}>
          <circle cx="12" cy="12" r="4.6" fill={col} fillOpacity={0.85} />
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
        </g>
      )}
      {lv === 4 && (
        <g strokeWidth={1.6}>
          <circle cx="8.5" cy="8.5" r="3.3" fill={col} stroke={col} />
          <path d="M8.5 2.6v1.3M2.6 8.5h1.3M4.3 4.3l.9.9M12.7 4.3l-.9.9" stroke={col} />
          <path d="M8 19.5h9.5a3.5 3.5 0 0 0 0-7 4.6 4.6 0 0 0-8.8 1.2A2.9 2.9 0 0 0 8 19.5z" fill="var(--surface)" stroke={col} />
        </g>
      )}
      {lv === 3 && <path d="M6.5 18.5h11a4 4 0 0 0 .3-8 5.5 5.5 0 0 0-10.6 1.5A3.3 3.3 0 0 0 6.5 18.5z" fill={col} fillOpacity={0.75} stroke={col} strokeWidth={1.6} />}
      {lv === 2 && (
        <g stroke={col} strokeWidth={1.7}>
          <path d="M16.5 3.5 9 14.5l2.6 1.8L19 5.3z" fill={col} fillOpacity={0.75} />
          <path d="M10.3 15.4 7.4 19.6a1.6 1.6 0 0 1-2.6-1.8" />
          <path d="M17.7 4.4l1.5-1.6" />
        </g>
      )}
      {lv === 1 && (
        <g stroke={col} strokeWidth={1.6}>
          <path d="M3.5 12.5a8.5 8.5 0 0 1 17 0z" fill={col} fillOpacity={0.85} />
          <path d="M12 12.5v6a1.7 1.7 0 0 1-3.4 0M12 2.8V4" />
          <path d="M5 16.5l-.8 2M19.6 16l-.8 2M16 18.5l-.7 1.8" />
        </g>
      )}
    </svg>
  );
}

/** Mặt cười (trục biểu đồ): miệng cười rộng → mếu theo nhóm. */
export function MoodFace({ level, size = 20 }: { level: number; size?: number }) {
  const lv = Math.min(5, Math.max(1, Math.round(level)));
  const col = c(lv);
  const mouth = { 5: "M8 13.5a4.2 4.2 0 0 0 8 0z", 4: "M8.4 14a4 4 0 0 0 7.2 0", 3: "M8.6 14.6h6.8", 2: "M8.6 15.6a4 4 0 0 1 6.8 0", 1: "M8.2 16.2a4.4 4.4 0 0 1 7.6 0" }[lv]!;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" fill={col} fillOpacity={0.18} />
      <path d={lv === 1 ? "M8 9.6l2 .8M16 9.6l-2 .8" : "M9.2 10h.01M14.8 10h.01"} strokeWidth={lv === 1 ? 1.6 : 2.6} />
      <path d={mouth} fill={lv === 5 ? col : "none"} />
    </svg>
  );
}

/** Icon thời tiết trong ô vuông nền nhạt cùng màu, kèm chữ khi cần (chú thích, tỉ lệ). */
export function MoodChip({ level, size = 36, label = false, className }: { level: number; size?: number; label?: boolean; className?: string }) {
  const l = moodLevel(level);
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-xl"
        style={{ width: size, height: size, background: `color-mix(in srgb, ${c(l.value)} 16%, var(--surface))` }}
        title={l.label}
      >
        <WeatherIcon level={l.value} size={Math.round(size * 0.66)} />
      </span>
      {label && <span className="font-semibold">{l.label}</span>}
    </span>
  );
}
