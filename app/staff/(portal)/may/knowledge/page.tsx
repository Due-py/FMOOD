import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { kbDocuments, kbSummary } from "@/lib/admin-data";
import { getSetting } from "@/lib/settings";
import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/admin/AdminUI";
import { AddDocument, DocumentList, KbConfigForm, SearchTester, TrainAllButton } from "./KnowledgeForms";

export const metadata: Metadata = { title: "Kho kiến thức" };

function formatDateTime(iso: string | null) {
  if (!iso) return "chưa có";
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "numeric", month: "numeric", year: "numeric" }).format(new Date(iso));
}

export default async function KnowledgePage() {
  await requireStaff(["admin"]);
  const [docs, summary, config] = await Promise.all([kbDocuments(), kbSummary(), getSetting("kb.config")]);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Mây" title="Kho kiến thức">
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Tài liệu đã duyệt (ví dụ sách Well-being) để Mây tra cứu khi trả lời. <strong>Dạy lại</strong> = chia tài liệu thành
          đoạn nhỏ và tạo “dấu vân tay nghĩa” cho từng đoạn. Khi học sinh nhắn, Mây tìm vài đoạn gần nghĩa nhất để tham
          khảo.
        </p>
      </PageHeader>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Tài liệu sẵn sàng" value={`${summary.ready}/${summary.total}`} tone="bg-sky" />
        <Stat label="Đoạn kiến thức" value={summary.chunks} tone="bg-mint" />
        <Stat label="Dạy lại gần nhất" value={formatDateTime(summary.lastTrained)} tone="bg-butter" small />
        <div className="flex items-center justify-center rounded-[var(--radius-card)] bg-lilac p-4">
          <TrainAllButton disabled={docs.length === 0} />
        </div>
      </section>

      <Section title="Thêm tài liệu" description="PDF phải là bản có thể chọn chữ (không phải ảnh scan). Có thể dán thẳng nội dung văn bản.">
        <AddDocument />
      </Section>

      <Section title={`Tài liệu (${docs.length})`}>
        <DocumentList docs={docs} />
      </Section>

      <Section title="Thử tra cứu" description="Gõ một câu học sinh có thể hỏi để xem Mây sẽ tìm được đoạn nào.">
        <SearchTester />
      </Section>

      <Section title="Cài đặt tra cứu">
        <KbConfigForm key={JSON.stringify(config)} initial={config} />
      </Section>
    </div>
  );
}

function Stat({ label, value, tone, small }: { label: string; value: string | number; tone: string; small?: boolean }) {
  return (
    <div className={`rounded-[var(--radius-card)] p-4 ${tone}`}>
      <p className={small ? "font-semibold" : "font-display text-3xl font-extrabold"}>{value}</p>
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}
