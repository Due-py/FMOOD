import Link from "next/link";
import { cn } from "@/components/ui/cn";

/** Năm tab của Hành trình: Tổng quan và bốn mục tự theo dõi. */
export const JOURNEY_TABS = [
  { href: "/hanh-trinh", label: "Tổng quan" },
  { href: "/tam-trang", label: "Tâm trạng" },
  { href: "/nhat-ky", label: "Nhật ký" },
  { href: "/habits", label: "Thói quen" },
  { href: "/garden", label: "Khu vườn" },
] as const;
export type JourneyTab = (typeof JOURNEY_TABS)[number]["href"];

/**
 * Khung chung của Hành trình (Duy 01/11 tối): tiêu đề + MỘT hàng tab, bỏ panel phải "Tự theo dõi" để trang chỉ còn
 * một menu (menu trái). Cùng tiêu đề, cùng hàng tab, cùng bề rộng ở cả 5 trang nên bấm tab chỉ đổi phần dưới.
 * Căn giữa vùng trống (data-chat-page) như Hôm nay; rộng 896px để lịch / lưới năm của Tâm trạng không chật.
 * Điện thoại: 5 tab giãn hết bề ngang, mỗi tab một dòng, chữ co theo bề ngang màn hình (không phải vuốt mới thấy tab cuối).
 */
export function JourneyShell({ active, children }: { active: JourneyTab; children: React.ReactNode }) {
  return (
    <div data-chat-page className="mx-auto w-full max-w-4xl">
      <header>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Hành trình của mình</h1>
        <p className="mt-1 text-muted">Những bước bạn đã đi. Chỉ so với chính bạn hôm trước, không điểm, không xếp hạng.</p>
      </header>
      <nav aria-label="Hành trình" className="mt-4 border-b border-line">
        <ul className="flex justify-between sm:justify-start sm:gap-1">
          {JOURNEY_TABS.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={t.href === active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center whitespace-nowrap border-b-2 px-1 text-[clamp(11px,3.4vw,13px)] font-semibold transition sm:px-4 sm:text-base",
                  t.href === active ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink",
                )}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
