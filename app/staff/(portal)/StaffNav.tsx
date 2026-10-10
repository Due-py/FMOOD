"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/components/ui/cn";
import type { NavGroup } from "@/lib/staff-nav";

export function StaffNav({
  groups,
  newAlerts,
  urgentAlerts,
}: {
  groups: NavGroup[];
  newAlerts: number;
  urgentAlerts: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // đóng menu điện thoại khi chuyển trang
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [pathname]);

  const current = groups.flatMap((g) => g.items).find((i) => pathname.startsWith(i.href));

  const list = (
    <div className="space-y-5">
      <NavLink href="/staff" label="Bàn làm việc" emoji="🏠" active={pathname === "/staff"} />
      {groups.map((g) => (
        <div key={g.title}>
          <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-wider text-muted">{g.title}</p>
          <ul className="space-y-0.5">
            {g.items.map((item) => (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  label={item.label}
                  emoji={item.emoji}
                  active={pathname.startsWith(item.href)}
                  badge={item.href === "/staff/alerts" ? newAlerts : 0}
                  urgent={urgentAlerts > 0}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
      <NavLink href="/staff/account" label="Tài khoản" emoji="⚙️" active={pathname.startsWith("/staff/account")} />
    </div>
  );

  return (
    <nav aria-label="Điều hướng thầy cô" className="px-3 py-3 md:flex-1 md:overflow-y-auto md:py-5">
      {/* điện thoại: menu thu gọn */}
      <div className="md:hidden">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between rounded-2xl bg-surface-2 px-4 py-2.5 text-sm font-semibold"
        >
          <span>
            {current ? `${current.emoji} ${current.label}` : pathname === "/staff" ? "🏠 Bàn làm việc" : "Menu"}
            {newAlerts > 0 && (
              <span className={cn("ml-2 rounded-full px-2 py-0.5 text-xs font-bold text-white", urgentAlerts ? "bg-danger" : "bg-[var(--series-neu)]")}>
                {newAlerts}
              </span>
            )}
          </span>
          <span aria-hidden>{open ? "▲" : "▼"}</span>
        </button>
        {open && <div className="mt-3 pb-2">{list}</div>}
      </div>
      <div className="hidden md:block">{list}</div>
    </nav>
  );
}

function NavLink({
  href,
  label,
  emoji,
  active,
  badge = 0,
  urgent = false,
}: {
  href: string;
  label: string;
  emoji: string;
  active: boolean;
  badge?: number;
  urgent?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-2xl px-3 py-2 text-sm font-semibold transition",
        active ? "bg-brand-soft text-brand-strong dark:text-brand" : "text-muted hover:bg-surface-2 hover:text-ink",
      )}
    >
      <span aria-hidden className="w-5 text-center">
        {emoji}
      </span>
      {label}
      {badge > 0 && (
        <span
          className={cn("ml-auto min-w-6 rounded-full px-2 py-0.5 text-center text-xs font-bold text-white", urgent ? "bg-danger" : "bg-[var(--series-neu)]")}
          aria-label={`${badge} cảnh báo mới`}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
