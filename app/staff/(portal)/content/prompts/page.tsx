import type { Metadata } from "next";
import { requirePage } from "@/lib/permissions";
import { getSetting } from "@/lib/settings";
import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/admin/AdminUI";
import { StartersForm } from "./PromptForms";

export const metadata: Metadata = { title: "Câu mở lời" };

export default async function PromptsPage() {
  await requirePage("/staff/content/prompts");
  // Câu hỏi suy ngẫm hằng ngày đã bỏ hẳn (Duy 01/11): trang chỉ còn câu mở đầu trò chuyện
  const starters = await getSetting("chat.starters");

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Nội dung" title="Câu mở lời" />

      <Section
        title="Câu mở đầu trò chuyện"
        description="Các nút gợi ý hiện khi học sinh mở cuộc trò chuyện mới với trợ lý. Giúp những bạn “không biết bắt đầu nói thế nào”."
      >
        <StartersForm key={starters.items.join("|")} initial={starters.items} />
      </Section>
    </div>
  );
}
