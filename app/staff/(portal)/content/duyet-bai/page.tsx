import type { Metadata } from "next";
import { requirePage } from "@/lib/permissions";
import { lessonsForReview } from "@/lib/lesson-review";
import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/admin/AdminUI";
import { LessonReviewList } from "./LessonReviewList";

export const metadata: Metadata = { title: "Duyệt bài thư viện" };

/** Danh sách bài thư viện đã duyệt / chưa duyệt: nguồn, người duyệt, ngày duyệt (admin và phòng tham vấn). */
export default async function LessonReviewPage({ searchParams }: PageProps<"/staff/content/duyet-bai">) {
  await requirePage("/staff/content/duyet-bai");
  const { xem } = await searchParams;
  const { ready, items } = await lessonsForReview();
  const reviewed = items.filter((l) => l.reviewed_at).length;
  const visible = items.filter((l) => l.published && l.reviewed_at).length;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Nội dung" title="Duyệt bài thư viện">
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Đọc từng bài rồi bấm <strong className="text-ink">Đã duyệt</strong>: tên người duyệt và ngày duyệt hiện ở cuối bài cho học
          sinh thấy. <strong className="text-ink">Học sinh chỉ thấy bài đã đăng và đã duyệt.</strong> Khi admin sửa nội dung bài, bài
          trở lại <strong className="text-ink">chưa duyệt</strong> và tạm ẩn với học sinh cho tới khi duyệt lại. Đã duyệt{" "}
          <strong className="text-ink">{reviewed}</strong> / {items.length} bài; học sinh đang thấy{" "}
          <strong className="text-ink">{visible}</strong> bài.
        </p>
      </PageHeader>
      {!ready && (
        <Section title="Chưa ghi được người duyệt" description="Cần chạy một file trên máy chủ dữ liệu trước.">
          <p className="text-sm">
            Chạy <code>supabase/migrations/0015_duyet_bai_thu_vien.sql</code> trong Supabase SQL Editor, rồi tải lại trang này. Trong lúc
            chờ, danh sách vẫn xem được và sửa được nguồn.
          </p>
        </Section>
      )}
      <LessonReviewList items={items} ready={ready} initialTab={xem === "da-duyet" ? "reviewed" : "pending"} />
    </div>
  );
}
