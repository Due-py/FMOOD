import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff, ROLE_LABEL, type Profile } from "@/lib/auth";
import { aiHealth, kbSummary, recentAudit } from "@/lib/admin-data";
import { listChallenges } from "@/lib/challenges";
import { classPulse } from "@/lib/class-pulse";
import { listClassLessons } from "@/lib/class-content";
import { currentHour } from "@/lib/dates";
import { countHelpWaiting } from "@/lib/help-requests";
import { greeting } from "@/lib/mascot";
import { getSetting } from "@/lib/settings";
import { countNewAlerts, listAlerts, listClasses } from "@/lib/staff";
import { canHandleAlerts } from "@/lib/staff-privacy";
import { pageAccess } from "@/lib/permissions";
import type { NavGroup } from "@/lib/staff-nav";
import { CharacterAvatar } from "@/components/mascot/CharacterAvatar";
import { SpeechBubble } from "@/components/SpeechBubble";
import { cn } from "@/components/ui/cn";
import { AlertCard } from "./AlertCard";
import { PulseCard } from "./PulseCard";
import { VersionLine } from "./VersionLine";

export const metadata: Metadata = { title: "Hôm nay" };

type Todo = { href: string; emoji: string; text: string; action: string; tone: string; urgent?: boolean };

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "numeric", month: "numeric" }).format(new Date(iso));
}

/** Việc đang chờ người này, nói bằng một câu thường. */
async function todosFor(profile: Profile): Promise<Todo[]> {
  const handles = canHandleAlerts(profile.role);
  const [alerts, help, open, mine] = await Promise.all([
    countNewAlerts(profile),
    countHelpWaiting(profile),
    listAlerts(profile, { status: "open", limit: 50 }),
    handles ? listAlerts(profile, { status: "open", mine: true, limit: 50 }) : Promise.resolve([]),
  ]);
  const todos: Todo[] = [];

  if (handles) {
    if (alerts.urgent > 0)
      todos.push({ href: "/staff/alerts?trang=new", emoji: "🚨", text: `${alerts.urgent} cảnh báo khẩn cấp chưa ai nhận`, action: "Xem ngay", tone: "bg-danger-soft", urgent: true });
    if (alerts.total - alerts.urgent > 0)
      todos.push({ href: "/staff/alerts?trang=new", emoji: "🛟", text: `${alerts.total - alerts.urgent} cảnh báo cần để ý chưa ai nhận`, action: "Xem", tone: "bg-peach" });
    if (mine.length > 0)
      todos.push({ href: "/staff/alerts?trang=mine", emoji: "🧾", text: `${mine.length} cảnh báo thầy cô đã nhận, chưa xong`, action: "Tiếp tục", tone: "bg-surface-2" });
  } else if (open.length > 0) {
    const waiting = open.filter((a) => a.status === "new").length;
    todos.push({
      href: "/staff/alerts",
      emoji: "🛟",
      text: `${open.length} bạn trong lớp đang cần được quan tâm · ${waiting ? "phòng tham vấn chưa nhận" : "phòng tham vấn đã nhận"}`,
      action: "Xem",
      tone: open.some((a) => a.severity === "urgent") ? "bg-danger-soft" : "bg-peach",
      urgent: open.some((a) => a.severity === "urgent"),
    });
  }

  if (help > 0)
    todos.push({ href: "/staff/loi-nho", emoji: "🙋", text: `${help} bạn hẹn nói chuyện với thầy cô`, action: "Trả lời", tone: "bg-butter" });

  if (profile.role === "teacher") {
    const [{ items: challenges }, { items: lessons }] = await Promise.all([listChallenges(profile), listClassLessons(profile)]);
    const drafts = lessons.filter((l) => !l.published).length;
    if (drafts > 0) todos.push({ href: "/staff/bai-cho-lop", emoji: "📝", text: `${drafts} bài đang là nháp, lớp chưa thấy`, action: "Mở", tone: "bg-surface-2" });
    const running = challenges.filter((c) => c.open);
    if (running.length === 0)
      todos.push({ href: "/staff/thu-thach", emoji: "🌟", text: "Lớp chưa có thử thách nào. Gợi ý một việc nhỏ cả lớp cùng làm?", action: "Tạo", tone: "bg-mint" });
  }
  return todos;
}

export default async function Today() {
  const profile = await requireStaff();
  const isAdmin = profile.role === "admin";
  const isTeacher = profile.role === "teacher";
  // chỉ nhắc việc ở trang người này được mở (Phân quyền, Bước 11)
  const access = await pageAccess(profile);
  const [allTodos, classes, alerts] = await Promise.all([
    todosFor(profile),
    isTeacher && access.canOpen("/staff/classes") ? listClasses(profile) : Promise.resolve([]),
    canHandleAlerts(profile.role) ? listAlerts(profile, { status: "new", limit: 3 }) : Promise.resolve([]),
  ]);
  const todos = allTodos.filter((t) => access.canOpen(t.href.split("?")[0]));
  const pulses = await Promise.all(classes.map(async (c) => ({ cls: c, pulse: await classPulse(profile, c.id) })));
  const urgent = todos.some((t) => t.urgent);

  const bubble = urgent
    ? "Có bạn đang cần giúp gấp. Thầy cô xem ngay nhé!"
    : todos.length > 0
      ? `Hôm nay có ${todos.length} việc cần thầy cô xem.`
      : "Hôm nay mọi việc ổn, không có gì đang chờ.";

  return (
    <div className="fm-stagger space-y-8">
      <header className="flex items-end gap-3">
        <CharacterAvatar size={92} mood={urgent ? "worried" : "happy"} />
        <div className="mb-2 min-w-0 flex-1">
          <p className="text-sm text-muted">
            {greeting(currentHour())}, {ROLE_LABEL[profile.role].toLowerCase()}
          </p>
          <h1 className="truncate font-display text-3xl font-extrabold tracking-tight">{profile.nickname}</h1>
          <SpeechBubble className={cn("mt-2", urgent && "border-danger/40 bg-danger-soft")}>{bubble}</SpeechBubble>
        </div>
      </header>

      <section aria-labelledby="todo-title">
        <h2 id="todo-title" className="mb-3 font-display text-2xl font-bold tracking-tight">
          Việc cần làm
        </h2>
        {todos.length === 0 ? (
          <p className="rounded-[var(--radius-card)] bg-mint p-6 text-center font-semibold">🌤️ Không có việc gì đang chờ thầy cô.</p>
        ) : (
          <ul className="space-y-2">
            {todos.map((t) => (
              <li key={t.text}>
                <Link
                  href={t.href}
                  className={cn(
                    "flex items-center gap-4 rounded-[var(--radius-card)] px-5 py-4 transition hover:-translate-y-0.5",
                    t.tone,
                    t.urgent && "ring-2 ring-danger/40",
                  )}
                >
                  <span className="text-2xl" aria-hidden>
                    {t.emoji}
                  </span>
                  <span className="min-w-0 flex-1 text-[17px] font-semibold leading-snug">{t.text}</span>
                  <span className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-bold", t.urgent ? "bg-danger text-white" : "bg-surface text-ink")}>
                    {t.action}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pulses.length > 0 && (
        <section aria-labelledby="pulse-title">
          <h2 id="pulse-title" className="mb-3 font-display text-2xl font-bold tracking-tight">
            Lớp của tôi tuần này
          </h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {pulses.map(({ cls, pulse }) => (
              <PulseCard key={cls.id} classId={cls.id} name={cls.name} total={cls.studentCount} data={pulse} />
            ))}
          </div>
        </section>
      )}

      {alerts.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold tracking-tight">Chưa ai nhận</h2>
            <Link href="/staff/alerts" className="text-sm font-semibold text-brand-strong hover:underline dark:text-brand">
              Xem tất cả
            </Link>
          </div>
          <div className="space-y-3">
            {alerts.map((a) => (
              <AlertCard key={`${a.id}-${a.status}-${a.handled_at}`} alert={a} selfId={profile.id} />
            ))}
          </div>
        </section>
      )}

      {isAdmin && <MayStatus />}

      <Tools groups={access.nav} />

      {isAdmin && <RecentActivity />}

      <VersionLine />
    </div>
  );
}

/** Mọi công cụ người này được mở (theo Phân quyền), gom theo nhóm. */
function Tools({ groups }: { groups: NavGroup[] }) {
  return (
    <section aria-labelledby="tools-title" className="space-y-5">
      <h2 id="tools-title" className="font-display text-2xl font-bold tracking-tight">
        Công cụ của thầy cô
      </h2>
      {groups.map((g) => (
        <div key={g.title}>
          <h3 className="mb-2 text-sm font-semibold text-muted">{g.title}</h3>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {g.items.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={cn("flex h-full flex-col rounded-[var(--radius-card)] p-4 transition hover:-translate-y-1", g.tone)}>
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-surface/70 text-xl" aria-hidden>
                    {item.emoji}
                  </span>
                  <span className="mt-4 font-display text-base font-bold leading-tight tracking-tight">{item.label}</span>
                  <span className="mt-0.5 text-xs text-muted">{item.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
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
        <CharacterAvatar size={48} float={false} mood="calm" />
        <div>
          <p className="font-display text-lg font-bold tracking-tight">Trợ lý có khỏe không</p>
          <p className="text-xs text-muted">{aiOk ? "Trợ lý đang trả lời bình thường" : "Trợ lý đang gặp nhiều lỗi"}</p>
        </div>
      </div>
      <div className="text-sm">
        <p>
          Trợ lý đã đọc <strong>{kb.ready}</strong> tài liệu
        </p>
        <p className="text-muted">Cập nhật tài liệu gần nhất: {kb.lastTrained ? formatDateTime(kb.lastTrained) : "chưa có"}</p>
      </div>
      <div className="ml-auto space-y-1 text-sm">
        <Dot ok={aiOk} label={`Trò chuyện: ${aiOk ? "tốt" : "nhiều lỗi"}${chat.calls ? ` (${chat.calls} lượt/7 ngày)` : ""}`} />
        <Dot ok={health.db.ok} label={`Lưu dữ liệu: ${health.db.ok ? "tốt" : "lỗi"}`} />
        <p className="sr-only">Model: {models.chat}</p>
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
