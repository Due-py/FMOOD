// Mọi phép tính "ngày" đều theo giờ Việt Nam, không theo múi giờ của server.
export const TIME_ZONE = "Asia/Ho_Chi_Minh";

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "YYYY-MM-DD" theo giờ Việt Nam. */
export function dayKey(date: Date | string = new Date()): string {
  return dayFormatter.format(typeof date === "string" ? new Date(date) : date);
}

/** Cộng/trừ số ngày trên một dayKey. */
export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** Giờ hiện tại (0–23) theo giờ Việt Nam. */
export function currentHour(): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TIME_ZONE,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date()),
  );
}

/** Mốc thời gian bắt đầu một ngày VN (00:00 giờ VN) dạng ISO. */
export function startOfDayIso(key: string): string {
  return new Date(`${key}T00:00:00+07:00`).toISOString();
}

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function weekdayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "numeric",
  }).format(new Date(iso));
}
