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
import { BookIcon, ChatIcon, HabitIcon, HomeIcon, UserIcon } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

/** Biểu tượng Luyện kỹ năng (mục tiêu có mũi tên trúng tâm), nét giống bộ icon chung. */
const PracticeIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="11" cy="13" r="8" />
    <circle cx="11" cy="13" r="3.5" />
    <path d="m11 13 9-9M16 4h4v4" />
  </svg>
);

const TABS = [
  { href: "/home", label: "Trang chủ", Icon: HomeIcon },
  { href: "/chat", label: "Trò chuyện", Icon: ChatIcon },
  { href: "/luyen", label: "Luyện", Icon: PracticeIcon },
  { href: "/habits", label: "Thói quen", Icon: HabitIcon },
  { href: "/library", label: "Thư viện", Icon: BookIcon },
  { href: "/me", label: "Tôi", Icon: UserIcon },
];

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/**
 * Điều hướng học sinh.
 * - Máy tính: thanh ngang trên cùng (theo mẫu Inspiration 1): logo · mục IN HOA ở giữa · nút tròn + nút xanh.
 * - Điện thoại: thanh tab dưới cùng cho dễ bấm bằng ngón cái.
 */
/** Sự kiện trình duyệt: số lời đáp chưa đọc vừa đổi (học sinh bấm "Mình đã đọc"). */
export const UNREAD_EVENT = "fmood:loi-dap-da-doc";

/** Chấm báo nhỏ trên mục Trang chủ khi có lời đáp của thầy cô chưa đọc (có chữ cho trình đọc màn hình). */
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

/** `checkedToday`: hôm nay đã ghi tâm trạng chưa; rồi thì header không hiện nút "Check-in" (Duy chọn 01/11: chỉ giữ "Cần giúp"). */
export function TabBar({ avatar, checkedToday }: { avatar: AvatarView; checkedToday: boolean }) {
  const pathname = usePathname();
  // chấm báo ở Trang chủ: thầy cô đã trả lời lời hẹn mà bạn ấy chưa đọc (lời đáp hiện ở Trang chủ)
  const unread = useUnreadReplies(pathname);

  return (
    <>
      {/* máy tính */}
      <header className="fixed inset-x-0 top-0 z-40 hidden border-b border-line/60 bg-bg-top/80 backdrop-blur-xl md:block">
        <div className="mx-auto flex h-20 max-w-6xl items-center gap-6 px-6">
          <Link href="/home" className="flex items-center gap-2" aria-label="F-Mood – Safe & Sound, trang chủ">
            <CharacterAvatar size={34} float={false} />
            <BrandMark />
          </Link>
          <nav aria-label="Điều hướng chính" className="flex flex-1 justify-center">
            <ul className="flex items-center gap-1">
              {TABS.filter((t) => t.href !== "/me").map(({ href, label }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative rounded-full px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] transition duration-300",
                        active ? "text-ink" : "text-muted hover:text-ink",
                      )}
                    >
                      {label}
                      {href === "/home" && <UnreadDot count={unread} className="right-1 top-1" />}
                      <span
                        className={cn(
                          "absolute inset-x-4 -bottom-0.5 h-0.5 origin-left rounded-full bg-brand transition-transform duration-500",
                          active ? "scale-x-100" : "scale-x-0",
                        )}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="flex items-center gap-2">
            <HelpButton />
            <Link
              href="/me"
              aria-label="Tôi"
              aria-current={isActive(pathname, "/me") ? "page" : undefined}
              className="group flex size-11 shrink-0 items-center justify-center rounded-full"
            >
              {/* viền nằm trên chính khung cắt tròn của ảnh (không ở thẻ link bọc ngoài) để luôn đồng tâm, không méo */}
              <Avatar
                avatar={avatar}
                size={44}
                className={cn("ring-2 ring-line transition duration-300 group-hover:ring-brand", isActive(pathname, "/me") && "ring-brand")}
              />
            </Link>
            {/* chỉ khi hôm nay chưa ghi tâm trạng (và không đang ở trang check-in) */}
            {!checkedToday && pathname !== "/checkin" && (
              <Link href="/checkin" className={cn(btn.cta, "py-3")}>
                Check-in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* điện thoại: thanh mỏng trên cùng có nút "Cần giúp", có nền riêng nên không đè lên nội dung khi cuộn
          (trang trò chuyện đã có nút riêng ở đầu khung chat) */}
      {!/^\/chat\/.+/.test(pathname) && (
        <header className="sticky top-0 z-40 border-b border-line/60 bg-bg-top/95 pt-[env(safe-area-inset-top)] backdrop-blur-xl md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/home" className="flex items-center gap-1.5" aria-label="F-Mood – Safe & Sound, trang chủ">
              <CharacterAvatar size={28} float={false} />
              <BrandMark size="sm" />
            </Link>
            {pathname !== "/giup-do" && <HelpButton />}
          </div>
        </header>
      )}
      <nav
        aria-label="Điều hướng chính"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <ul className="mx-auto flex max-w-md justify-around px-2">
          {TABS.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition",
                    active ? "text-brand-strong dark:text-brand" : "text-muted",
                  )}
                >
                  <span className={cn("relative flex h-8 w-14 items-center justify-center rounded-full transition duration-300", active && "bg-brand-soft")}>
                    <Icon size={21} />
                    {href === "/home" && <UnreadDot count={unread} className="right-3 top-0.5" />}
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
