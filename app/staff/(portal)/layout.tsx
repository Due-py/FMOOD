import { requireStaff, ROLE_LABEL } from "@/lib/auth";
import { countNewAlerts } from "@/lib/staff";
import { navForRole } from "@/lib/staff-nav";
import { May } from "@/components/mascot/May";
import { StaffNav } from "./StaffNav";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireStaff();
  const alerts = await countNewAlerts(profile);

  return (
    <div className="md:pl-64">
      <aside className="border-b border-line bg-surface/90 backdrop-blur-xl md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 px-4 pt-4 md:px-5 md:pt-6">
          <May size={36} float={false} />
          <div className="min-w-0">
            <p className="font-display text-lg font-extrabold leading-tight tracking-tight">F-Mood</p>
            <p className="text-xs text-muted">Trang thầy cô</p>
          </div>
        </div>

        <StaffNav groups={navForRole(profile.role)} newAlerts={alerts.total} urgentAlerts={alerts.urgent} />

        <div className="hidden shrink-0 border-t border-line p-4 md:block">
          <p className="truncate font-semibold">{profile.nickname}</p>
          <p className="truncate text-xs text-muted">{ROLE_LABEL[profile.role]}</p>
          {/* thẻ <a> thường (không prefetch) để không vô tình đăng xuất */}
          <a href="/signout?to=/staff/login" className="mt-3 inline-block text-sm font-semibold text-muted hover:text-ink">
            Đăng xuất
          </a>
        </div>
      </aside>

      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6 md:pt-10">{children}</main>
    </div>
  );
}
