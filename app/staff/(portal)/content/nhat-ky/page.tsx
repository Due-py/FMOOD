import type { Metadata } from "next";
import { requirePage } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/admin/AdminUI";
import type { JournalKind } from "@/lib/journal-shared";
import { JournalPromptManager, type AdminPrompt } from "./JournalPromptManager";

export const metadata: Metadata = { title: "Mẫu câu nhật ký" };

/** Mẫu câu nhật ký (chỉ admin): thấy số lần đã dùng, không thấy nội dung nhật ký của học sinh. */
export default async function JournalPromptsPage() {
  await requirePage("/staff/content/nhat-ky");
  const db = createAdminClient();
  const [{ data, error }, { count }] = await Promise.all([
    db.from("journal_prompts").select("id, kind, text, emoji, active, sort_order, uses").order("sort_order").order("created_at"),
    db.from("journal_entries").select("id", { count: "exact", head: true }),
  ]);
  const ready = !(error?.code === "42P01" || error?.code === "PGRST205");

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Nội dung" title="Mẫu câu nhật ký">
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Học sinh chọn một mẫu để bắt đầu trang nhật ký. Nội dung nhật ký là riêng tư của học sinh, thầy cô và admin không đọc được; trang
          này chỉ đếm số lần mỗi mẫu được dùng. {ready && `Đã có ${count ?? 0} trang nhật ký.`}
        </p>
      </PageHeader>
      {!ready ? (
        <Section title="Chưa sẵn sàng" description="Cần chạy file supabase/migrations/0024_nhat_ky.sql trên máy chủ dữ liệu trước.">
          <p className="text-sm text-muted">Chạy xong thì tải lại trang này.</p>
        </Section>
      ) : (
        <Section title="Các mẫu câu" description="Câu mở đầu: học sinh viết tiếp ngay sau câu. Câu hỏi nổi bật: một câu hỏi để học sinh trả lời. Mũi tên để đổi thứ tự hiện.">
          <JournalPromptManager prompts={((data ?? []) as AdminPrompt[]).map((p) => ({ ...p, kind: p.kind as JournalKind }))} />
        </Section>
      )}
    </div>
  );
}
