import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { ROLE_LABEL, type Role } from "@/lib/auth";
import { requirePage } from "@/lib/permissions";
import { staffLog } from "@/lib/activity-data";
import { AUDIT_KINDS, isAuditKind } from "@/lib/audit-shared";
import { formatDate, formatTime } from "@/lib/dates";
import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/admin/AdminUI";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { ExportButton } from "../research/ExportButton";

export const metadata: Metadata = { title: "Nhật ký hoạt động" };

// NHẬT KÝ HOẠT ĐỘNG (kế hoạch Demo 3, 12.2 và 12.5). CHỈ ADMIN, kể cả sau khi có Phân quyền (Bước 11).
// Chỉ ghi việc thầy cô làm. Duy 04/11: bỏ hẳn nhật ký hoạt động học sinh (cả bảng student_activity_log, migration 0029)
// để giữ đúng cam kết với học sinh; trang chỉ còn một dòng nói rõ điều đó.

/** Số dòng hiện trên trang (file CSV có đủ các dòng đã đọc). */
const SHOW = 400;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

type Search = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
const day = (v: string | string[] | undefined) => {
  const s = one(v);
  return s && DAY.test(s) ? s : undefined;
};
const when = (iso: string) => `${formatDate(iso)} ${formatTime(iso)}`;
const roleLabel = (r: string | null) => (r ? (ROLE_LABEL[r as Role] ?? r) : "–");

export default async function ActivityLogPage({ searchParams }: { searchParams: Search }) {
  await requirePage("/staff/nhat-ky");
  const sp = await searchParams;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Chỉ admin" title="Nhật ký hoạt động">
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Ai đã làm gì, lúc nào trong trang thầy cô. Nhật ký chỉ được thêm, không ai sửa hay xóa được.
        </p>
      </PageHeader>

      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
        <p className="font-display text-lg font-bold">🔒 Không có nhật ký hoạt động của học sinh</p>
        <p className="mt-1 text-sm text-muted">
          F-Mood không ghi nhật ký việc làm của từng học sinh và không lưu lời các em viết vào nhật ký nào. Cách cả lớp dùng app
          chỉ hiện thành con số chung ở Tổng quan app, không biết là bạn nào. Đúng như cam kết với học sinh.
        </p>
      </div>

      <StaffTab sp={sp} />
    </div>
  );
}

// ───────────────────────── Thầy cô ─────────────────────────

async function StaffTab({ sp }: { sp: Awaited<Search> }) {
  const nguoi = one(sp.nguoi);
  const actorId = nguoi && z.uuid().safeParse(nguoi).success ? nguoi : undefined;
  const role = one(sp.vai) || undefined;
  const loai = one(sp.loai);
  const kind = isAuditKind(loai) ? loai : undefined;
  const from = day(sp.tu);
  const to = day(sp.den);
  const { ready, rows, truncated, members } = await staffLog({ actorId, role, kind, from, to });
  const member = actorId ? members.find((m) => m.id === actorId) : undefined;
  const roles = [...new Set(members.map((m) => m.role))];

  const csv = [
    ["Thời gian", "Người làm", "Vai trò", "Loại", "Thao tác", "Chi tiết", "Đối tượng", "Trang"],
    ...rows.map((r) => [r.at, r.actorName, roleLabel(r.role), AUDIT_KINDS[r.kind], r.action, r.detail ?? "", r.target ?? "", r.page ?? ""]),
  ];

  return (
    <>
      <form method="get" className="grid gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Thành viên</span>
          <select name="nguoi" defaultValue={actorId ?? ""} className={input}>
            <option value="">Tất cả</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} · {roleLabel(m.role)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Nhóm</span>
          <select name="vai" defaultValue={role ?? ""} className={input}>
            <option value="">Tất cả</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Loại thao tác</span>
          <select name="loai" defaultValue={kind ?? ""} className={input}>
            <option value="">Tất cả</option>
            {Object.entries(AUDIT_KINDS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <DateRange from={from} to={to} />
        <FilterButtons reset="/staff/nhat-ky" />
      </form>

      <Section
        title={member ? `Toàn bộ hoạt động của ${member.name}` : "Hoạt động của thầy cô"}
        description={
          <>
            {rows.length} dòng{truncated ? " (chỉ đọc 3.000 dòng mới nhất, hãy thu hẹp khoảng ngày)" : ""}.{" "}
            {member && (
              <Link href="/staff/nhat-ky" className="font-semibold text-brand-strong hover:underline dark:text-brand">
                Xem mọi người
              </Link>
            )}
          </>
        }
      >
        <div className="mb-4">
          <ExportButton rows={csv} filename={`fmood-nhat-ky-thay-co${member ? `-${member.name}` : ""}.csv`} />
        </div>
        {!ready ? (
          <p className="text-sm text-muted">Chưa đọc được nhật ký. Thử tải lại trang.</p>
        ) : rows.length === 0 ? (
          <p className="rounded-2xl bg-surface-2 p-6 text-center text-sm text-muted">Không có hoạt động nào khớp bộ lọc.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.slice(0, SHOW).map((r) => (
              <li key={r.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-2.5 text-sm">
                <span className="w-24 shrink-0 tabular-nums text-xs text-muted">{when(r.at)}</span>
                {r.actorId && r.role !== "student" ? (
                  <Link href={`/staff/nhat-ky?nguoi=${r.actorId}`} className="font-semibold hover:underline">
                    {r.actorName}
                  </Link>
                ) : (
                  <strong>{r.actorName}</strong>
                )}
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">{roleLabel(r.role)}</span>
                <span className="rounded-full bg-sky px-2 py-0.5 text-xs font-semibold">{AUDIT_KINDS[r.kind]}</span>
                <span>{r.action}</span>
                {r.detail && <span className="min-w-0 break-words text-muted">· {r.detail}</span>}
                {r.target && <span className="min-w-0 break-all text-xs text-muted">· {r.target}</span>}
                {r.page && <span className="text-xs text-muted">· {r.page}</span>}
              </li>
            ))}
          </ul>
        )}
        {rows.length > SHOW && <p className="mt-3 text-xs text-muted">Đang hiện {SHOW} dòng mới nhất; tải CSV để có đủ {rows.length} dòng.</p>}
      </Section>
    </>
  );
}

function DateRange({ from, to }: { from?: string; to?: string }) {
  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      <label>
        <span className="mb-1 block font-semibold">Từ ngày</span>
        <input type="date" name="tu" defaultValue={from ?? ""} className={cn(input, "px-3")} />
      </label>
      <label>
        <span className="mb-1 block font-semibold">Đến ngày</span>
        <input type="date" name="den" defaultValue={to ?? ""} className={cn(input, "px-3")} />
      </label>
    </div>
  );
}

function FilterButtons({ reset }: { reset: string }) {
  return (
    <div className="flex items-end gap-2">
      <button type="submit" className={btn.primary}>
        Lọc
      </button>
      <Link href={reset} className={btn.ghost}>
        Bỏ lọc
      </Link>
    </div>
  );
}
