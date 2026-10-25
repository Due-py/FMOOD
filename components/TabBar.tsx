"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { HelpButton } from "@/components/HelpButton";
import { May } from "@/components/mascot/May";
import type { AvatarView } from "@/lib/avatars";
import { BookIcon, ChatIcon, HabitIcon, HomeIcon, UserIcon } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

const TABS = [
  { href: "/home", label: "Trang chủ", Icon: HomeIcon },
  { href: "/chat", label: "Trò chuyện", Icon: ChatIcon },
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
export function TabBar({ avatar }: { avatar: AvatarView }) {
  const pathname = usePathname();

  return (
    <>
      {/* máy tính */}
      <header className="fixed inset-x-0 top-0 z-40 hidden border-b border-line/60 bg-bg-top/80 backdrop-blur-xl md:block">
        <div className="mx-auto flex h-20 max-w-6xl items-center gap-6 px-6">
          <Link href="/home" className="flex items-center gap-2" aria-label="F-Mood, trang chủ">
            <May size={34} float={false} />
            <span className="font-display text-lg font-extrabold tracking-tight">F-Mood</span>
          </Link>
          <nav aria-label="Điều hướng chính" className="flex flex-1 justify-center">
            <ul className="flex items-center gap-1">
              {TABS.slice(0, 4).map(({ href, label }) => {
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
              className={cn("rounded-full ring-2 ring-line transition duration-300 hover:ring-brand", isActive(pathname, "/me") && "ring-brand")}
            >
              <Avatar avatar={avatar} size={44} />
            </Link>
            <Link href="/checkin" className={cn(btn.cta, "py-3")}>
              Check-in
            </Link>
          </div>
        </div>
      </header>

      {/* điện thoại: thanh mỏng trên cùng có nút "Cần giúp", có nền riêng nên không đè lên nội dung khi cuộn
          (trang trò chuyện đã có nút riêng ở đầu khung chat) */}
      {!/^\/chat\/.+/.test(pathname) && (
        <header className="sticky top-0 z-40 border-b border-line/60 bg-bg-top/95 pt-[env(safe-area-inset-top)] backdrop-blur-xl md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/home" className="flex items-center gap-1.5" aria-label="F-Mood, trang chủ">
              <May size={28} float={false} />
              <span className="font-display font-extrabold tracking-tight">F-Mood</span>
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
                  <span className={cn("flex h-8 w-14 items-center justify-center rounded-full transition duration-300", active && "bg-brand-soft")}>
                    <Icon size={21} />
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
