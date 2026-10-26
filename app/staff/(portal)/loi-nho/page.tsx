import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { listHelpRequests } from "@/lib/help-requests";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/components/ui/cn";
import { NotReady } from "../NotReady";
import { HelpRequestCard } from "./HelpRequestCard";

export const metadata: Metadata = { title: "Lời nhờ giúp" };

export default async function HelpInboxPage({ searchParams }: PageProps<"/staff/loi-nho">) {
  const profile = await requireStaff();
  const { trang } = await searchParams;
  const done = trang === "xong";
  const { ready, items } = await listHelpRequests(profile, { open: !done });
  const isTeacher = profile.role === "teacher";

  return (
    <>
      <PageHeader eyebrow={isTeacher ? "Học sinh lớp thầy cô" : "Gửi phòng tham vấn"} title="Lời nhờ giúp">
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Học sinh hẹn nói chuyện, không phải việc khẩn cấp. Trả lời một câu để em biết thầy cô đã đọc; em sẽ thấy lời đáp ở trang
          chủ. Gặp em xong thì bấm “Đã gặp em, xong”.
        </p>
      </PageHeader>

      <nav aria-label="Lọc lời nhờ" className="mb-5 flex gap-2">
        {[
          { href: "/staff/loi-nho", label: "Đang chờ", active: !done },
          { href: "/staff/loi-nho?trang=xong", label: "Đã xong", active: done },
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

      {!ready ? (
        <NotReady />
      ) : items.length === 0 ? (
        <p className="rounded-3xl bg-mint p-8 text-center font-semibold">
          <span className="block text-3xl" aria-hidden>
            🌤️
          </span>
          {done ? "Chưa có lời nhờ nào đã xong." : "Không có lời nhờ nào đang chờ."}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            // dựng lại thẻ khi trạng thái đổi (vd. sau Hoàn tác) để ô trả lời hiện đúng
            <HelpRequestCard key={`${r.id}-${r.status}-${r.reply ?? ""}`} request={r} />
          ))}
        </div>
      )}

      <aside className="mt-8 rounded-[var(--radius-card)] bg-sky p-5 text-sm leading-relaxed">
        <p className="font-semibold">Nếu lời nhắn có dấu hiệu nguy hiểm</p>
        <p className="mt-1 text-muted">
          F-Mood tự kiểm tra lời nhắn. Có dấu hiệu nguy hiểm thì phòng tham vấn nhận thêm một cảnh báo riêng. Khi có nguy cơ ngay,
          liên hệ gia đình và gọi 115. Tổng đài Bảo vệ trẻ em: 111.
        </p>
      </aside>
    </>
  );
}
