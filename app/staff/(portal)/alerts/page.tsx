import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { listAlerts, type AlertStatus } from "@/lib/staff";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/components/ui/cn";
import { AlertCard } from "../AlertCard";

export const metadata: Metadata = { title: "Cảnh báo" };

const TABS: { value: AlertStatus | "open"; label: string }[] = [
  { value: "open", label: "Chưa xong" },
  { value: "new", label: "Mới" },
  { value: "seen", label: "Đang xử lý" },
  { value: "resolved", label: "Đã xong" },
];

export default async function AlertsPage({ searchParams }: PageProps<"/staff/alerts">) {
  const profile = await requireStaff();
  const { trang } = await searchParams;
  const status = TABS.find((t) => t.value === trang)?.value ?? "open";
  const alerts = await listAlerts(profile, { status });

  return (
    <>
      <PageHeader eyebrow="Học sinh cần được quan tâm" title="Cảnh báo">
        <p className="mt-2 max-w-2xl text-sm text-muted">
          {profile.role === "teacher"
            ? "Cảnh báo của các lớp thầy cô chủ nhiệm."
            : "Cảnh báo của tất cả các lớp."}{" "}
          Thầy cô chỉ thấy đoạn tin nhắn đáng lo, không đọc được các cuộc trò chuyện khác của học sinh.
        </p>
      </PageHeader>

      <nav aria-label="Lọc cảnh báo" className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={t.value === "open" ? "/staff/alerts" : `/staff/alerts?trang=${t.value}`}
            aria-current={status === t.value ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
              status === t.value ? "bg-ink text-bg" : "border border-line bg-surface text-muted hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {alerts.length === 0 ? (
        <p className="rounded-3xl bg-mint p-8 text-center">
          <span className="text-3xl" aria-hidden>
            🌤️
          </span>
          <span className="mt-2 block font-semibold">Không có cảnh báo nào ở mục này.</span>
        </p>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <AlertCard key={a.id} alert={a} />
          ))}
        </div>
      )}

      <aside className="mt-8 rounded-[var(--radius-card)] bg-sky p-5 text-sm leading-relaxed">
        <p className="font-semibold">Khi gặp cảnh báo khẩn cấp</p>
        <p className="mt-1 text-muted">
          Tìm gặp trực tiếp học sinh càng sớm càng tốt và phối hợp với phòng tham vấn. Nếu em có nguy cơ
          gặp nguy hiểm ngay, liên hệ gia đình và gọi 115. Tổng đài Bảo vệ trẻ em: 111.
        </p>
      </aside>
    </>
  );
}
