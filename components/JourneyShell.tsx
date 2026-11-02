import Link from "next/link";
import { MascotArt } from "@/components/mascot/MascotArt";
import { cn } from "@/components/ui/cn";

/** Năm tab của Hành trình: Tổng quan và bốn mục tự theo dõi. */
export const JOURNEY_TABS = [
  { href: "/hanh-trinh", label: "Tổng quan", emoji: "🧭" },
  { href: "/tam-trang", label: "Tâm trạng", emoji: "🌤️" },
  { href: "/nhat-ky", label: "Nhật ký", emoji: "📓" },
  { href: "/habits", label: "Thói quen", emoji: "✅" },
  { href: "/garden", label: "Khu vườn", emoji: "🌻" },
] as const;
export type JourneyTab = (typeof JOURNEY_TABS)[number]["href"];

/**
 * Khung chung của Hành trình (Duy 01/11 tối): tiêu đề + MỘT hàng tab, bỏ panel phải "Tự theo dõi" để trang chỉ còn
 * một menu (menu trái). Cùng tiêu đề, cùng hàng tab, cùng bề rộng ở cả 5 trang nên bấm tab chỉ đổi phần dưới.
 * Căn giữa vùng trống (data-chat-page) như Hôm nay; rộng 896px để lịch / lưới năm của Tâm trạng không chật.
 * Giao diện vui (mẫu hanh-trinh.html, Duy duyệt 02/11): nhân vật vẫy tay cạnh bong bóng lời có tiêu đề; hàng tab là một
 * thanh trắng bo tròn, mỗi tab có biểu tượng, tab đang mở nền bơ. Hai đốm màu nhạt phía sau cho trang mềm hơn.
 * Điện thoại: 5 tab giãn hết bề ngang, biểu tượng trên chữ, chữ co theo bề ngang màn hình (không phải vuốt mới thấy tab cuối).
 */
export function JourneyShell({ active, children }: { active: JourneyTab; children: React.ReactNode }) {
  return (
    <div data-chat-page className="relative isolate mx-auto w-full max-w-4xl">
      {/* đốm màu trang trí, nằm trong khung để không sinh thanh cuộn ngang */}
      <span aria-hidden className="pointer-events-none absolute -top-6 right-0 -z-10 size-56 rounded-full bg-c1 opacity-70 sm:size-72" />
      <span aria-hidden className="pointer-events-none absolute left-0 top-[34rem] -z-10 hidden size-48 rounded-full bg-c2 opacity-60 sm:block" />

      <header className="flex items-end gap-1">
        <MascotArt size={92} className="-mb-1 hidden sm:block" />
        <MascotArt size={64} className="-mb-1 sm:hidden" />
        <div className="mb-4 min-w-0 rounded-[1.6rem] rounded-bl-md bg-surface px-4 py-3 shadow-soft sm:mb-5 sm:px-5">
          <h1 className="font-display text-[1.6rem] font-extrabold leading-tight tracking-tight sm:text-3xl">Hành trình của mình</h1>
          <p className="mt-0.5 text-sm text-muted sm:text-[15px]">
            Đây là những bước bạn đã đi nè. Chỉ so với chính bạn hôm trước thôi, không điểm, không xếp hạng.
          </p>
        </div>
      </header>

      <nav aria-label="Hành trình" className="mt-1 rounded-[1.15rem] bg-surface p-1 shadow-soft sm:rounded-[1.4rem] sm:p-1.5">
        <ul className="flex gap-0.5 sm:gap-1.5">
          {JOURNEY_TABS.map((t) => {
            const on = t.href === active;
            return (
              <li key={t.href} className="min-w-0 flex-1 sm:flex-none">
                <Link
                  href={t.href}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 flex-col items-center justify-center whitespace-nowrap rounded-[0.9rem] px-0.5 py-1 text-[clamp(10.5px,3.1vw,12.5px)] font-semibold transition sm:flex-row sm:gap-2 sm:rounded-2xl sm:px-4 sm:py-2 sm:text-[15px]",
                    on ? "bg-brand font-bold text-brand-ink" : "text-muted hover:bg-surface-2 hover:text-ink",
                  )}
                >
                  <span aria-hidden className="text-lg leading-tight sm:text-[17px]">
                    {t.emoji}
                  </span>
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-6 sm:mt-7">{children}</div>
    </div>
  );
}
