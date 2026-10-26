import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { listAlerts, type AlertStatus } from "@/lib/staff";
import { canHandleAlerts } from "@/lib/staff-privacy";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/components/ui/cn";
import { AlertCard } from "../AlertCard";

export const metadata: Metadata = { title: "Cảnh báo" };

type Tab = AlertStatus | "open" | "mine";

export default async function AlertsPage({ searchParams }: PageProps<"/staff/alerts">) {
  const profile = await requireStaff();
  const handles = canHandleAlerts(profile.role);
  const { trang, "hoc-sinh": student } = await searchParams;
  const studentId = typeof student === "string" && z.uuid().safeParse(student).success ? student : undefined;

  const tabs: { value: Tab; label: string }[] = [
    { value: "open", label: "Chưa xong" },
    ...(handles ? [{ value: "mine" as const, label: "Việc của tôi" }] : []),
    { value: "new", label: "Chưa ai nhận" },
    { value: "resolved", label: "Đã xong" },
  ];
  const tab = studentId ? null : (tabs.find((t) => t.value === trang)?.value ?? "open");
  const alerts = await listAlerts(profile, {
    studentId,
    status: tab === "mine" ? "open" : (tab ?? undefined),
    mine: tab === "mine",
  });

  return (
    <>
      <PageHeader eyebrow="Học sinh cần được quan tâm" title="Cảnh báo">
        <p className="mt-2 max-w-2xl text-sm text-muted">
          {handles
            ? "Bấm “Tôi nhận” để đồng nghiệp biết đã có người lo. Thầy cô chỉ thấy đoạn tin nhắn đáng lo, không đọc được các cuộc trò chuyện khác của học sinh."
            : "Những bạn trong lớp thầy cô cần được quan tâm. Phòng tham vấn đọc nội dung và xử lý; thầy cô xem ai đã nhận và khi nào xong."}
        </p>
      </PageHeader>

      {studentId ? (
        <p className="mb-5 flex flex-wrap items-center gap-3 text-sm">
          <span className="font-semibold">Tất cả cảnh báo của em này, mới nhất ở trên</span>
          <Link href="/staff/alerts" className="font-semibold text-brand-strong hover:underline dark:text-brand">
            Quay lại danh sách
          </Link>
        </p>
      ) : (
        <nav aria-label="Lọc cảnh báo" className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
          {tabs.map((t) => (
            <Link
              key={t.value}
              href={t.value === "open" ? "/staff/alerts" : `/staff/alerts?trang=${t.value}`}
              aria-current={tab === t.value ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
                tab === t.value ? "bg-ink text-bg" : "border border-line bg-surface text-muted hover:text-ink",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      )}

      {alerts.length === 0 ? (
        <p className="rounded-3xl bg-mint p-8 text-center">
          <span className="text-3xl" aria-hidden>
            🌤️
          </span>
          <span className="mt-2 block font-semibold">{tab === "mine" ? "Thầy cô chưa nhận cảnh báo nào đang mở." : "Không có cảnh báo nào ở mục này."}</span>
        </p>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <AlertCard key={`${a.id}-${a.status}-${a.handled_at}`} alert={a} selfId={profile.id} />
          ))}
        </div>
      )}

      <aside className="mt-8 rounded-[var(--radius-card)] bg-sky p-5 text-sm leading-relaxed">
        <p className="font-semibold">Khi gặp cảnh báo khẩn cấp</p>
        <p className="mt-1 text-muted">
          Tìm gặp trực tiếp học sinh càng sớm càng tốt và phối hợp với phòng tham vấn. Nếu em có nguy cơ gặp nguy hiểm ngay,
          liên hệ gia đình và gọi 115. Tổng đài Bảo vệ trẻ em: 111.
        </p>
      </aside>
    </>
  );
}
