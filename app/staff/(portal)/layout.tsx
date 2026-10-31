import { requireStaff, ROLE_LABEL } from "@/lib/auth";
import { countHelpWaiting } from "@/lib/help-requests";
import { countNewAlerts } from "@/lib/staff";
import { staffNav } from "@/lib/permissions";
import { CharacterAvatar } from "@/components/mascot/CharacterAvatar";
import { AssistantProvider } from "@/components/mascot/AssistantContext";
import { currentAssistant } from "@/lib/assistant";
import { UndoProvider } from "@/components/staff/Undo";
import { DemoBanner } from "@/components/staff/DemoBanner";
import { demoOn, demoRegistry } from "@/lib/demo/server";
import { StaffNav } from "./StaffNav";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireStaff();
  const [alerts, help, demo, registry, assistant, nav] = await Promise.all([
    countNewAlerts(profile),
    countHelpWaiting(profile),
    demoOn(),
    demoRegistry(),
    currentAssistant(),
    // thanh bên theo bảng Phân quyền (Bước 11)
    staffNav(profile),
  ]);

  return (
    // trang thầy cô dùng nhân vật mặc định admin đặt (hình ở sân thử, trình diễn)
    <AssistantProvider value={{ key: assistant.key, name: assistant.name, emoji: assistant.emoji }}>
      <div className="md:pl-64 print:pl-0">
        <aside className="print:hidden border-b border-line bg-surface/90 backdrop-blur-xl md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col md:border-b-0 md:border-r">
          <div className="flex items-center gap-2 px-4 pt-4 md:px-5 md:pt-6">
            <CharacterAvatar size={36} float={false} />
            <div className="min-w-0">
              <p className="font-display text-lg font-extrabold leading-tight tracking-tight">F-Mood</p>
              <p className="text-xs text-muted">Trang thầy cô</p>
            </div>
          </div>

          <StaffNav
            groups={nav}
            badges={{ "/staff/alerts": { count: alerts.total, urgent: alerts.urgent > 0 }, "/staff/loi-nho": { count: help, urgent: false } }}
          />

          <div className="hidden shrink-0 border-t border-line p-4 md:block">
            <p className="truncate font-semibold">{profile.nickname}</p>
            <p className="truncate text-xs text-muted">{ROLE_LABEL[profile.role]}</p>
            {/* thẻ <a> thường (không prefetch) để không vô tình đăng xuất */}
            <a href="/signout?to=/staff/login" className="mt-3 inline-block text-sm font-semibold text-muted hover:text-ink">
              Đăng xuất
            </a>
          </div>
        </aside>

        <main className={demo ? "mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6" : "mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6 md:pt-10"}>
          {demo && <DemoBanner hasData={Boolean(registry)} />}
          <UndoProvider>{children}</UndoProvider>
        </main>
      </div>
    </AssistantProvider>
  );
}
