import Link from "next/link";
import { RightPanel } from "@/components/RightPanel";
import { side } from "@/app/(app)/chat/[id]/side-styles";
import { cn } from "@/components/ui/cn";

/** Bốn mục tự theo dõi của Hành trình. */
export const SELF_TRACK = [
  { href: "/tam-trang", emoji: "☁️", label: "Tâm trạng", note: "Theo ngày, theo năm" },
  { href: "/nhat-ky", emoji: "📓", label: "Nhật ký", note: "Viết cho chính mình" },
  { href: "/habits", emoji: "✅", label: "Thói quen", note: "Việc nhỏ mỗi ngày" },
  { href: "/garden", emoji: "🌱", label: "Khu vườn", note: "Cây của bạn" },
];

/**
 * Panel "Tự theo dõi" (Duy 01/11): luôn có ở trang Hành trình và ở 4 mục con, tô mục đang mở, như một menu con.
 * Cùng chuẩn chữ với panel khu Kỹ năng và Học cùng AI (side-styles: tiêu đề + một dòng mô tả, các dòng bấm được).
 * Từ 1280px là panel neo mép phải; nhỏ hơn là một hàng 4 nút (đặt component này ngay dưới tiêu đề trang Hành trình,
 * đầu tiên ở 4 mục con).
 */
export function JourneyPanel({ active }: { active?: string }) {
  return (
    <>
      <nav aria-label="Tự theo dõi" className="mb-4 grid grid-cols-4 gap-1 rounded-2xl bg-surface-2 p-1 xl:hidden">
        {SELF_TRACK.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.href === active ? "page" : undefined}
            className={cn(
              "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-center text-xs font-semibold transition",
              t.href === active ? "bg-surface text-ink shadow-sm" : active ? "text-muted hover:text-ink" : "text-ink hover:bg-surface",
            )}
          >
            <span aria-hidden className="text-base leading-none">
              {t.emoji}
            </span>
            {t.label}
          </Link>
        ))}
      </nav>
      <RightPanel aria-labelledby="tu-theo-doi" className="hidden xl:block">
        <div className={side.head}>
          <h2 id="tu-theo-doi" className={side.title}>
            Tự theo dõi
          </h2>
          <p className={side.desc}>Bốn góc nhỏ, chỉ bạn xem.</p>
        </div>
        <ul className={side.list}>
          {SELF_TRACK.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={t.href === active ? "page" : undefined}
                className={cn(side.row, "gap-3", t.href === active && "bg-brand-soft hover:bg-brand-soft")}
              >
                <span aria-hidden className="w-5 shrink-0 text-center text-base">
                  {t.emoji}
                </span>
                <span className="min-w-0">
                  <span className={side.rowTitle}>{t.label}</span>
                  <span className={side.rowSub}>{t.note}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {active && (
          <Link href="/hanh-trinh" className={cn(side.action, "mt-3")}>
            Về Hành trình của mình <span aria-hidden>→</span>
          </Link>
        )}
      </RightPanel>
    </>
  );
}
