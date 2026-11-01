"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { myUnreadReplies } from "@/app/actions/help";
import { Avatar } from "@/components/Avatar";
import { BrandMark } from "@/components/BrandMark";
import { HelpButton } from "@/components/HelpButton";
import { CharacterAvatar } from "@/components/mascot/CharacterAvatar";
import type { AvatarView } from "@/lib/avatars";
import { ChatIcon, HomeIcon } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";

/** Biểu tượng Kỹ năng (mục tiêu), nét giống bộ icon chung. */
const SkillIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1" />
  </svg>
);

/** Biểu tượng Hành trình (đường đi qua hai điểm), nét giống bộ icon chung. */
const JourneyIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="6" cy="19" r="2.5" />
    <circle cx="18" cy="5" r="2.5" />
    <path d="M8.5 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5" />
  </svg>
);

// 4 mục (Duy chốt 01/11, kế hoạch V2 mục 2): mỗi mục sáng cả khi ở trang con của nó.
// Thói quen, Khu vườn, Tâm trạng, Nhật ký là mục phụ của Hành trình; Thư viện và bài luyện thuộc Luyện kỹ năng.
// Tên mục (Duy 01/11): "Học cùng AI" → "Trò chuyện cùng AI", "Kỹ năng" → "Luyện kỹ năng".
const TABS = [
  { href: "/home", label: "Hôm nay", Icon: HomeIcon, also: [] as string[] },
  // trỏ thẳng /chat/new: /chat chỉ chuyển tiếp sang đó, mất thêm một lượt hỏi máy chủ mỗi lần bấm (01/11)
  { href: "/chat/new", label: "Trò chuyện cùng AI", Icon: ChatIcon, also: ["/chat"] },
  { href: "/ky-nang", label: "Luyện kỹ năng", Icon: SkillIcon, also: ["/luyen", "/library"] },
  {
    href: "/hanh-trinh",
    label: "Hành trình",
    Icon: JourneyIcon,
    also: ["/me/hanh-trinh", "/tam-trang", "/checkin", "/nhat-ky", "/habits", "/garden", "/viec-nho"],
  },
];

const under = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);
const isActive = (pathname: string, tab: (typeof TABS)[number]) => [tab.href, ...tab.also].some((h) => under(pathname, h));

/** Sự kiện trình duyệt: số lời đáp chưa đọc vừa đổi (học sinh bấm "Mình đã đọc"). */
export const UNREAD_EVENT = "fmood:loi-dap-da-doc";

/** Chấm báo nhỏ trên mục Hôm nay khi có lời đáp của thầy cô chưa đọc (có chữ cho trình đọc màn hình). */
function UnreadDot({ count, className }: { count: number; className: string }) {
  if (!count) return null;
  return (
    <span className={cn("absolute size-2.5 rounded-full bg-danger ring-2 ring-surface", className)}>
      <span className="sr-only">, {count === 1 ? "có 1 lời đáp mới của thầy cô" : `có ${count} lời đáp mới của thầy cô`}</span>
    </span>
  );
}

/**
 * Số lời đáp của thầy cô chưa đọc. Hỏi máy chủ SAU khi trang đã hiện (và mỗi lần chuyển trang), nên trang không phải chờ.
 * Lỗi mạng thì giữ số cũ, không làm phiền.
 */
function useUnreadReplies(pathname: string): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let live = true;
    const load = () =>
      myUnreadReplies()
        .then((n) => live && setCount(n))
        .catch(() => {});
    void load();
    // thẻ lời đáp báo "đã đọc" → đếm lại ngay, không chờ chuyển trang
    window.addEventListener(UNREAD_EVENT, load);
    return () => {
      live = false;
      window.removeEventListener(UNREAD_EVENT, load);
    };
  }, [pathname]);
  return count;
}

/**
 * Điều hướng học sinh (giao diện 01/11, wireframe V2):
 * - Máy tính (≥ 1024px): menu cố định bên trái 220px: logo · 4 mục · (khoảng trống) · Cần giúp · Tôi.
 * - Màn vừa (768–1023px): cùng menu trái nhưng chỉ còn biểu tượng (76px), nhãn đọc được bằng trình đọc màn hình và title.
 * - Điện thoại: thanh trên (logo · Cần giúp có chữ · Tôi) và thanh dưới 4 mục (chữ 12px, vùng bấm ≥ 44px).
 * Cần giúp luôn ở chỗ cố định, không cuộn mất.
 */
export function TabBar({ avatar }: { avatar: AvatarView }) {
  const pathname = usePathname();
  const unread = useUnreadReplies(pathname);
  const meActive = pathname === "/me" || (pathname.startsWith("/me/") && !pathname.startsWith("/me/hanh-trinh"));

  return (
    <>
      {/* máy tính, màn vừa: menu trái */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[76px] flex-col border-r border-line bg-surface px-2 py-4 md:flex lg:w-[220px] lg:px-3">
        <Link href="/home" className="mb-5 flex items-center gap-2 px-2" aria-label="F-Mood – Safe & Sound, Hôm nay">
          <CharacterAvatar size={34} float={false} />
          <BrandMark className="hidden lg:flex" />
        </Link>
        <nav aria-label="Điều hướng chính">
          <ul className="space-y-1">
            {TABS.map((tab) => {
              const active = isActive(pathname, tab);
              const { href, label, Icon } = tab;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    title={label}
                    className={cn(
                      // lg: lề và khoảng cách nhỏ hơn một chút để "Trò chuyện cùng AI" (≈142px) vừa một dòng trong menu 220px
                      "relative flex min-h-11 items-center justify-center gap-3 rounded-xl border px-3 py-2.5 text-[15px] font-semibold transition lg:justify-start lg:gap-2 lg:px-2.5",
                      active ? "border-brand-edge bg-brand-soft text-brand-strong" : "border-transparent text-muted hover:bg-surface-2 hover:text-ink",
                    )}
                  >
                    <span className="relative flex">
                      <Icon size={22} />
                      {href === "/home" && <UnreadDot count={unread} className="-right-1 -top-1" />}
                    </span>
                    <span className="sr-only lg:not-sr-only lg:whitespace-nowrap">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mt-auto space-y-2">
          <HelpButton className="w-full justify-center rounded-xl px-2 py-2.5 lg:justify-start lg:px-3" compactLabel />
          <Link
            href="/me"
            aria-current={meActive ? "page" : undefined}
            className={cn("flex min-h-11 items-center justify-center gap-3 rounded-xl px-2 py-2 font-semibold transition hover:bg-surface-2 lg:justify-start lg:px-3", meActive ? "text-ink" : "text-muted")}
          >
            {/* viền nằm trên chính khung cắt tròn của ảnh để luôn đồng tâm, không méo */}
            <Avatar avatar={avatar} size={32} className={cn("ring-2 ring-line", meActive && "ring-brand-edge")} />
            <span className="hidden lg:inline">Tôi</span>
            <span className="sr-only lg:hidden">Tôi</span>
          </Link>
        </div>
      </aside>

      {/* điện thoại: thanh trên có nút "Cần giúp" (trang trò chuyện có nút riêng ở đầu khung chat) */}
      {!/^\/chat\/.+/.test(pathname) && (
        <header className="sticky top-0 z-40 border-b border-line bg-bg-top/95 pt-[env(safe-area-inset-top)] backdrop-blur-xl md:hidden">
          <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-2 gap-y-1 px-4 py-1.5">
            <Link href="/home" className="flex items-center gap-1.5" aria-label="F-Mood – Safe & Sound, Hôm nay">
              <CharacterAvatar size={28} float={false} />
              <BrandMark size="sm" />
            </Link>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {pathname !== "/giup-do" && <HelpButton className="min-h-11" />}
              <Link href="/me" aria-label="Tôi" aria-current={meActive ? "page" : undefined} className="flex size-11 shrink-0 items-center justify-center rounded-full">
                <Avatar avatar={avatar} size={36} className={cn("ring-2 ring-line", meActive && "ring-brand-edge")} />
              </Link>
            </div>
          </div>
        </header>
      )}
      <nav
        aria-label="Điều hướng chính"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <ul className="mx-auto flex w-full max-w-md justify-around px-1">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab);
            const { href, label, Icon } = tab;
            return (
              <li key={href} className="flex min-w-0 flex-1">
                {/* tên dài ("Trò chuyện cùng AI") xuống 2 dòng ở điện thoại: các mục cao bằng nhau, biểu tượng thẳng một hàng trên cùng */}
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 w-full flex-col items-center justify-start gap-0.5 px-0.5 py-1.5 text-center text-xs font-semibold leading-tight transition [overflow-wrap:anywhere]",
                    active ? "text-brand-strong" : "text-muted",
                  )}
                >
                  <span className={cn("relative flex h-8 w-12 max-w-full items-center justify-center rounded-full border transition duration-300", active ? "border-brand-edge bg-brand-soft" : "border-transparent")}>
                    <Icon size={21} />
                    {href === "/home" && <UnreadDot count={unread} className="right-2.5 top-0.5" />}
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
