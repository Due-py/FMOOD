import Link from "next/link";
import { RightPanel } from "@/components/RightPanel";
import { cn } from "@/components/ui/cn";

/** Bốn mục tự theo dõi của Hành trình. */
export const SELF_TRACK = [
  { href: "/tam-trang", emoji: "☁️", label: "Tâm trạng", note: "Theo ngày, theo năm" },
  { href: "/nhat-ky", emoji: "📓", label: "Nhật ký", note: "Viết cho chính mình" },
  { href: "/habits", emoji: "✅", label: "Thói quen", note: "Việc nhỏ mỗi ngày" },
  { href: "/garden", emoji: "🌱", label: "Khu vườn", note: "Cây của bạn" },
];

/**
 * Panel "Tự theo dõi" (Duy 01/11): luôn có ở trang Hành trình và ở 4 mục con, tô đậm mục đang mở, như một menu con.
 * Trang Hành trình (`active` trống): dưới 1280px panel nằm dưới nội dung. Ở 4 mục con: dưới 1280px là một hàng 4 nút ở
 * đầu trang (đặt component này đầu tiên trong trang), từ 1280px là panel neo mép phải.
 */
export function JourneyPanel({ active }: { active?: string }) {
  return (
    <>
      {active && (
        <nav aria-label="Tự theo dõi" className="mb-4 grid grid-cols-4 gap-1 rounded-2xl bg-surface-2 p-1 xl:hidden">
          {SELF_TRACK.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              aria-current={t.href === active ? "page" : undefined}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-center text-xs font-semibold transition",
                t.href === active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
              )}
            >
              <span aria-hidden className="text-base leading-none">
                {t.emoji}
              </span>
              {t.label}
            </Link>
          ))}
        </nav>
      )}
      <RightPanel aria-labelledby="tu-theo-doi" className={cn("space-y-2", active ? "hidden xl:block" : "max-w-3xl xl:max-w-none")}>
        <h2 id="tu-theo-doi" className="text-sm font-semibold uppercase tracking-wide text-muted">
          Tự theo dõi
        </h2>
        <ul className={cn("grid grid-cols-1 gap-2", !active && "min-[420px]:grid-cols-2 xl:grid-cols-1")}>
          {SELF_TRACK.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={t.href === active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 items-center gap-3 rounded-[var(--radius-card)] border p-3 transition",
                  t.href === active ? "border-brand-edge bg-brand-soft" : "border-line bg-surface hover:border-brand-edge",
                )}
              >
                <span className="text-xl" aria-hidden>
                  {t.emoji}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">{t.label}</span>
                  <span className="block text-xs text-muted">{t.note}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {active && (
          <Link href="/hanh-trinh" className="inline-block pt-2 text-sm font-semibold text-brand-strong underline underline-offset-4">
            Về Hành trình của mình
          </Link>
        )}
      </RightPanel>
    </>
  );
}
