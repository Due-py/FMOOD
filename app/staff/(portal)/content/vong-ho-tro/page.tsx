import type { Metadata } from "next";
import { requirePage } from "@/lib/permissions";
import { allContent } from "@/lib/support-content-server";
import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/admin/AdminUI";
import { ContentReview } from "./ContentReview";

export const metadata: Metadata = { title: "Vòng hỗ trợ" };

export default async function SupportContentPage() {
  await requirePage("/staff/content/vong-ho-tro");
  const { ready, items } = await allContent();

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Nội dung" title="Vòng hỗ trợ">
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Nội dung giúp học sinh đi hết vòng: gọi tên chuyện bận lòng → chọn mức lo → thử việc nhỏ → kể với người thật →
          được hỏi lại sau vài ngày. Mỗi mục có 3 trạng thái: <strong className="text-ink">Tắt</strong> (không ai thấy),{" "}
          <strong className="text-ink">Chỉ lớp thử</strong> (chỉ lớp được đánh dấu lớp thử, như THUVONG) và{" "}
          <strong className="text-ink">Bật cho mọi lớp</strong>. Nội dung mẫu ban đầu đều đang tắt.
        </p>
      </PageHeader>

      {!ready ? (
        <Section title="Chưa có dữ liệu" description="Cần chạy hai bước một lần trên máy chủ dữ liệu.">
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>
              Chạy file <code>supabase/migrations/0010_vong_ho_tro.sql</code> trong Supabase SQL Editor.
            </li>
            <li>
              Chạy lệnh <code>npm run vong:import</code> để nhập nội dung mẫu (tất cả ở trạng thái Tắt).
            </li>
          </ol>
        </Section>
      ) : items.length === 0 ? (
        <Section title="Chưa có nội dung" description="Chạy lệnh npm run vong:import để nhập nội dung mẫu.">
          <p className="text-sm text-muted">Nội dung mẫu được nhập ở trạng thái Tắt để thầy cô đọc trước.</p>
        </Section>
      ) : (
        <ContentReview items={items} />
      )}
    </div>
  );
}
