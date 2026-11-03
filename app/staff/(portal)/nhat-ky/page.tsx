import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { ROLE_LABEL, type Role } from "@/lib/auth";
import { requirePage } from "@/lib/permissions";
import { staffLog, studentLog, studentLogCount } from "@/lib/activity-data";
import { describeActivity } from "@/lib/activity-describe";
import { ACTIVITY_KINDS } from "@/lib/activity-log-shared";
import { AUDIT_KINDS, isAuditKind, STUDENT_CODE_RE } from "@/lib/audit-shared";
import { formatDate, formatTime } from "@/lib/dates";
import { getSetting, getSettingMeta } from "@/lib/settings";
import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/admin/AdminUI";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { ExportButton } from "../research/ExportButton";
import { ClearLogButton, LogSwitch, NameLookup, TextLogSwitch } from "./LogControls";

export const metadata: Metadata = { title: "Nhật ký hoạt động" };

// NHẬT KÝ HOẠT ĐỘNG (kế hoạch Demo 3, 12.2 và 12.5). CHỈ ADMIN, kể cả sau khi có Phân quyền (Bước 11).
// Thẻ "Thầy cô": ai làm gì, lúc nào. Thẻ "Học sinh": chỉ mã HS-…, không họ tên; lời các em viết chỉ có khi admin bật ghi lời (Duy 03/11).

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
const fmtDay = (d: string) => `${d.slice(8)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

export default async function ActivityLogPage({ searchParams }: { searchParams: Search }) {
  await requirePage("/staff/nhat-ky");
  const sp = await searchParams;
  const tab = one(sp.xem) === "hoc-sinh" ? "students" : "staff";

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Chỉ admin" title="Nhật ký hoạt động">
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Ai đã làm gì, lúc nào trong trang thầy cô. Nhật ký thầy cô chỉ được thêm, không ai sửa hay xóa được. Học sinh
          chỉ hiện bằng mã, không hiện họ tên; lời các em viết chỉ có ở những dòng ghi lúc bật “Ghi cả lời học sinh viết”.
        </p>
      </PageHeader>

      <nav aria-label="Chọn nhật ký" className="flex gap-2">
        {[
          { href: "/staff/nhat-ky", label: "👩‍🏫 Thầy cô", active: tab === "staff" },
          { href: "/staff/nhat-ky?xem=hoc-sinh", label: "🎒 Học sinh", active: tab === "students" },
        ].map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.active ? "page" : undefined}
            className={cn("rounded-full px-4 py-2 text-sm font-semibold", t.active ? "bg-ink text-bg" : "border border-line bg-surface text-muted hover:text-ink")}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "staff" ? <StaffTab sp={sp} /> : <StudentTab sp={sp} />}
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

// ───────────────────────── Học sinh ─────────────────────────

async function StudentTab({ sp }: { sp: Awaited<Search> }) {
  const lop = one(sp.lop);
  const classId = lop && z.uuid().safeParse(lop).success ? lop : undefined;
  const ma = one(sp.ma)?.trim().toUpperCase();
  const code = ma && STUDENT_CODE_RE.test(ma) ? ma : undefined;
  const loai = one(sp.loai);
  const kind = loai && loai in ACTIVITY_KINDS ? loai : undefined;
  const from = day(sp.tu);
  const to = day(sp.den);
  const [log, setting, meta, total] = await Promise.all([studentLog({ classId, code, kind, from, to }), getSetting("log.students"), getSettingMeta("log.students"), studentLogCount()]);
  const label = (k: string) => ACTIVITY_KINDS[k as keyof typeof ACTIVITY_KINDS] ?? k;

  const csv = [
    ["Thời gian", "Mã học sinh", "Lớp", "Việc", "Chi tiết", "Mã kèm theo", "Lời học sinh viết / tâm trạng"],
    ...log.rows.map((r) => [r.at, r.code, r.classTag, label(r.kind), describeActivity(r.kind, r.ref) ?? "", r.ref ?? "", r.content ?? ""]),
  ];
  const dayCsv = [["Ngày", "Số việc", "Số mã học sinh", ...Object.values(ACTIVITY_KINDS)], ...log.perDay.map((d) => [d.day, d.total, d.students, ...Object.keys(ACTIVITY_KINDS).map((k) => d.counts[k] ?? 0)])];

  return (
    <>
      {/* Duy 01/11: chỉ công tắc (bật là ghi, không giới hạn ngày) và nút xóa toàn bộ, không giải thích dài */}
      <Section title="Ghi hoạt động học sinh">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <LogSwitch enabled={setting.enabled} />
          {total != null && <ClearLogButton total={total} />}
        </div>
        <p className="mt-3 text-sm text-muted">
          Ghi rõ từng việc (bài luyện, tình huống, bước trò chuyện, số chữ đã viết). Hiện có {total == null ? "– (chưa chạy migration 0016)" : `${total} dòng`}.
        </p>
        {/* Duy 03/11: công tắc riêng để tự thử; áp cho mọi học sinh, tắt bằng tay; học sinh không thấy gì */}
        <div className={cn("mt-4 rounded-2xl border p-4", setting.text ? "border-danger bg-danger-soft" : "border-line bg-surface")}>
          <p className="mb-2 text-sm font-bold">Ghi cả lời học sinh viết và tâm trạng</p>
          <TextLogSwitch enabled={setting.text} />
          <p className={cn("mt-2 text-sm", setting.text ? "font-semibold text-danger" : "text-muted")}>
            {setting.text
              ? `Đang bật${meta.updatedBy ? ` (${meta.updatedBy}, ${when(meta.updatedAt!)})` : ""}: lời của MỌI học sinh, kể cả lớp thật, đang được ghi. App vẫn nói với học sinh là thầy cô không đọc. Tắt ngay khi thử xong.`
              : "Chỉ bật khi tự thử chức năng. Khi bật: tin nhắn, cảm xúc và mức tâm trạng, bài luyện, tình huống tự kể, nhật ký của mọi học sinh đều được ghi. Học sinh không thấy gì khác."}
            {setting.text && !setting.enabled && " Công tắc ghi hoạt động ở trên đang tắt nên chưa ghi gì."}
          </p>
        </div>
      </Section>

      <form method="get" className="grid gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
        <input type="hidden" name="xem" value="hoc-sinh" />
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Lớp</span>
          <select name="lop" defaultValue={classId ?? ""} className={input}>
            <option value="">Tất cả</option>
            {log.classOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Mã học sinh</span>
          <input name="ma" defaultValue={code ?? ma ?? ""} placeholder="HS-8A1-07" className={input} autoComplete="off" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Việc</span>
          <select name="loai" defaultValue={kind ?? ""} className={input}>
            <option value="">Tất cả</option>
            {Object.entries(ACTIVITY_KINDS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <DateRange from={from} to={to} />
        <FilterButtons reset="/staff/nhat-ky?xem=hoc-sinh" />
      </form>

      {ma && !code && <p className="rounded-2xl bg-peach p-4 text-sm">Mã “{ma}” chưa đúng dạng HS-8A1-07.</p>}

      {code && (
        <Section
          title={`Dòng thời gian của ${code}`}
          description={log.unknownCode ? "Không có học sinh nào mang mã này." : "Mọi việc em này đã làm trong khoảng đã chọn, mới nhất ở trên."}
        >
          <div className="flex flex-wrap items-center gap-3">
            {!log.unknownCode && <NameLookup code={code} />}
            <Link href="/staff/nhat-ky?xem=hoc-sinh" className="text-sm font-semibold text-brand-strong hover:underline dark:text-brand">
              Xem mọi học sinh
            </Link>
          </div>
        </Section>
      )}

      {!log.ready ? (
        <p className="rounded-2xl bg-surface-2 p-6 text-center text-sm text-muted">Chưa có bảng nhật ký học sinh. Cần chạy migration 0016.</p>
      ) : (
        <>
          <Section title="Đếm theo ngày" description="Số việc và số mã học sinh có hoạt động mỗi ngày (theo bộ lọc ở trên).">
            <div className="mb-4">
              <ExportButton rows={dayCsv} filename="fmood-nhat-ky-hoc-sinh-theo-ngay.csv" />
            </div>
            {log.perDay.length === 0 ? (
              <p className="text-sm text-muted">Chưa có dữ liệu.</p>
            ) : (
              <div className="-mx-1 overflow-x-auto px-1">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="text-left text-muted">
                      <th className="py-1 font-medium">Ngày</th>
                      <th className="py-1 text-right font-medium">Số việc</th>
                      <th className="py-1 text-right font-medium">Số mã</th>
                      <th className="py-1 pl-4 font-medium">Nhiều nhất</th>
                    </tr>
                  </thead>
                  <tbody>
                    {log.perDay.map((d) => (
                      <tr key={d.day} className="border-t border-line">
                        <td className="py-1.5">{fmtDay(d.day)}</td>
                        <td className="py-1.5 text-right tabular-nums">{d.total}</td>
                        <td className="py-1.5 text-right tabular-nums">{d.students}</td>
                        <td className="py-1.5 pl-4 text-muted">
                          {Object.entries(d.counts)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 3)
                            .map(([k, n]) => `${label(k)} ${n}`)
                            .join(" · ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section title={code ? `Việc của ${code}` : "Từng việc"} description={`${log.rows.length} dòng${log.truncated ? " (chỉ đọc 3.000 dòng mới nhất)" : ""}. File CSV có mã, không có tên.`}>
            <div className="mb-4">
              <ExportButton rows={csv} filename={`fmood-nhat-ky-hoc-sinh${code ? `-${code}` : ""}.csv`} />
            </div>
            {log.rows.length === 0 ? (
              <p className="rounded-2xl bg-surface-2 p-6 text-center text-sm text-muted">Không có việc nào khớp bộ lọc.</p>
            ) : (
              <ul className="divide-y divide-line">
                {log.rows.slice(0, SHOW).map((r) => (
                  <li key={r.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-2 text-sm">
                    <span className="w-24 shrink-0 tabular-nums text-xs text-muted">{when(r.at)}</span>
                    <Link href={`/staff/nhat-ky?xem=hoc-sinh&ma=${r.code}`} className="font-mono text-xs font-semibold hover:underline">
                      {r.code}
                    </Link>
                    <span>{label(r.kind)}</span>
                    {r.ref && (
                      <span className="min-w-0 break-words text-muted" title={r.ref}>
                        · {describeActivity(r.kind, r.ref)}
                      </span>
                    )}
                    {r.content && (
                      <span className="mt-1 basis-full sm:pl-[6.5rem]">
                        <q className="inline-block max-w-full whitespace-pre-line break-words rounded-xl bg-surface-2 px-3 py-2 text-[13px] before:content-none after:content-none">
                          {r.content}
                        </q>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {log.rows.length > SHOW && <p className="mt-3 text-xs text-muted">Đang hiện {SHOW} dòng mới nhất; tải CSV để có đủ {log.rows.length} dòng.</p>}
          </Section>
        </>
      )}
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
