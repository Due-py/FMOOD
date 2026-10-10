import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff, ROLE_LABEL } from "@/lib/auth";
import { aiHealth, kbSummary, recentAudit } from "@/lib/admin-data";
import { currentHour } from "@/lib/dates";
import { greeting } from "@/lib/mascot";
import { getSetting } from "@/lib/settings";
import { countNewAlerts, listAlerts } from "@/lib/staff";
import { navForRole } from "@/lib/staff-nav";
import { May } from "@/components/mascot/May";
import { SpeechBubble } from "@/components/SpeechBubble";
import { cn } from "@/components/ui/cn";
import { AlertCard } from "./AlertCard";

export const metadata: Metadata = { title: "Bàn làm việc" };

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "numeric", month: "numeric" }).format(new Date(iso));
}

export default async function Workspace() {
  const profile = await requireStaff();
  const isAdmin = profile.role === "admin";
  const [counts, alerts] = await Promise.all([countNewAlerts(profile), listAlerts(profile, { status: "open", limit: 3 })]);
  const groups = navForRole(profile.role);

  const bubble =
    counts.urgent > 0
      ? `Có ${counts.urgent} cảnh báo khẩn cấp đang chờ. Thầy cô xem ngay nhé!`
      : counts.total > 0
        ? `Có ${counts.total} cảnh báo mới cần xem.`
        : "Hôm nay mọi việc ổn. Không có cảnh báo mới.";

  return (
    <div className="fm-stagger space-y-8">
      <header className="flex items-end gap-3">
        <May size={92} mood={counts.urgent > 0 ? "worried" : "happy"} />
        <div className="mb-2 min-w-0 flex-1">
          <p className="text-sm text-muted">
            {greeting(currentHour())}, {ROLE_LABEL[profile.role].toLowerCase()}
          </p>
          <h1 className="truncate font-display text-3xl font-extrabold tracking-tight">{profile.nickname}</h1>
          <SpeechBubble className={cn("mt-2", counts.urgent > 0 && "border-danger/40 bg-danger-soft")}>{bubble}</SpeechBubble>
        </div>
      </header>

      {isAdmin && <MayStatus />}

      <div className="space-y-6">
        {groups.map((g) => (
          <section key={g.title}>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">{g.title}</h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {g.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    data-cursor-label="Mở"
                    className={cn("group flex h-full flex-col rounded-[var(--radius-card)] p-4 transition duration-500 hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_rgba(60,40,10,0.45)]", g.tone)}
                  >
                    <span className="flex items-start justify-between">
                      <span className="flex size-10 items-center justify-center rounded-2xl bg-surface/70 text-xl" aria-hidden>
                        {item.emoji}
                      </span>
                      {item.href === "/staff/alerts" && counts.total > 0 && (
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold text-white", counts.urgent ? "bg-danger" : "bg-[var(--series-neu)]")}>
                          {counts.total}
                        </span>
                      )}
                    </span>
                    <span className="mt-6 font-display text-base font-bold leading-tight tracking-tight">{item.label}</span>
                    <span className="mt-0.5 text-xs text-muted">{item.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {alerts.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold tracking-tight">Cảnh báo chưa xong</h2>
            <Link href="/staff/alerts" className="text-sm font-semibold text-brand-strong hover:underline dark:text-brand">
              Xem tất cả
            </Link>
          </div>
          <div className="space-y-3">
            {alerts.map((a) => (
              <AlertCard key={a.id} alert={a} />
            ))}
          </div>
        </section>
      )}

      {isAdmin && <RecentActivity />}
    </div>
  );
}

async function MayStatus() {
  const [models, kb, health] = await Promise.all([getSetting("ai.models"), kbSummary(), aiHealth()]);
  const chat = health.byKind.find((k) => k.kind === "chat")!;
  const aiOk = chat.calls === 0 || chat.errors / chat.calls < 0.2;
  return (
    <Link
      href="/staff/may/health"
      className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[var(--radius-card)] border border-line bg-surface p-5 transition hover:bg-surface-2"
    >
      <div className="flex items-center gap-3">
        <May size={48} float={false} mood="calm" />
        <div>
          <p className="font-display text-lg font-bold tracking-tight">Tình trạng Mây</p>
          <p className="font-mono text-xs text-muted">{models.chat}</p>
        </div>
      </div>
      <div className="text-sm">
        <p>
          <strong>{kb.ready}</strong> tài liệu · <strong>{kb.chunks}</strong> đoạn kiến thức
        </p>
        <p className="text-muted">Dạy lại gần nhất: {kb.lastTrained ? formatDateTime(kb.lastTrained) : "chưa có"}</p>
      </div>
      <div className="ml-auto space-y-1 text-sm">
        <Dot ok={aiOk} label={`AI: ${aiOk ? "tốt" : "nhiều lỗi"}${chat.calls ? ` (${chat.calls} lượt chat/7 ngày)` : ""}`} />
        <Dot ok={health.db.ok} label={`Cơ sở dữ liệu: ${health.db.ok ? "tốt" : "lỗi"}`} />
      </div>
    </Link>
  );
}

function Dot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <p className="flex items-center gap-2">
      <span className={cn("size-2.5 rounded-full", ok ? "bg-[var(--series-pos)]" : "bg-danger")} aria-hidden />
      {label}
    </p>
  );
}

async function RecentActivity() {
  const items = await recentAudit();
  if (!items.length) return null;
  return (
    <section>
      <h2 className="mb-3 font-display text-2xl font-bold tracking-tight">Hoạt động gần đây</h2>
      <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
        {items.map((a, i) => (
          <li key={i} className="flex flex-wrap items-baseline gap-x-2 px-5 py-3 text-sm">
            <strong>{a.actor_name}</strong>
            <span>{a.action.toLowerCase()}</span>
            {a.detail && <span className="truncate text-muted">· {a.detail}</span>}
            <span className="ml-auto text-xs text-muted">{formatDateTime(a.created_at)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
