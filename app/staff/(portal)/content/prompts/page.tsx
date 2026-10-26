import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { reflectionQuestions } from "@/lib/admin-data";
import { getSetting } from "@/lib/settings";
import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/admin/AdminUI";
import { ReflectionManager, StartersForm } from "./PromptForms";

export const metadata: Metadata = { title: "Câu hỏi & gợi ý" };

export default async function PromptsPage() {
  await requireStaff(["admin"]);
  const [starters, { questions, totalAnswers }] = await Promise.all([getSetting("chat.starters"), reflectionQuestions()]);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Nội dung" title="Câu hỏi & gợi ý" />

      <Section
        title="Câu mở đầu trò chuyện"
        description="Các nút gợi ý hiện khi học sinh mở cuộc trò chuyện mới với Mây. Giúp những bạn “không biết bắt đầu nói thế nào”."
      >
        <StartersForm key={starters.items.join("|")} initial={starters.items} />
      </Section>

      <Section
        title="Câu hỏi suy ngẫm hằng ngày"
        description={`Mỗi ngày trang chủ học sinh hiện một câu, xoay vòng theo thứ tự. Câu trả lời là riêng tư của học sinh, thầy cô và admin không đọc được. Đã có ${totalAnswers} lượt trả lời.`}
      >
        <ReflectionManager questions={questions} />
      </Section>
    </div>
  );
}
