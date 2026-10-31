import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { surveyForStudent } from "@/lib/surveys-server";
import { ArrowLeft } from "@/components/ui/icons";
import { btn, pill } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { SupportCard } from "@/components/SupportCard";
import { SurveyForm } from "./SurveyForm";

export const metadata: Metadata = { title: "Khảo sát" };

export default async function SurveyPage({ params }: PageProps<"/survey/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const profile = await requireProfile();
  const found = await surveyForStudent(profile, id);
  if (!found) notFound();
  // bài đo kỹ năng làm ở trang riêng (lớp "chỉ làm bài đo" cũng vào được)
  if (found.survey.kind === "test") redirect(`/bai-do/${id}`);

  return (
    <div>
      <Link href="/home" className={cn(btn.ghost, "-ml-3 mb-2")}>
        <ArrowLeft size={18} /> Trang chủ
      </Link>
      <span className={pill}>Khảo sát</span>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">{found.survey.title}</h1>
      {found.survey.description && <p className="mt-2 whitespace-pre-wrap text-muted">{found.survey.description}</p>}
      <p className="mt-2 text-xs text-muted">
        Câu trả lời được tổng hợp ẩn danh cho nghiên cứu của nhóm. Thầy cô không xem được câu trả lời của riêng bạn.
      </p>

      {found.answered ? (
        <p className="mt-6 rounded-3xl bg-mint p-6 text-center font-semibold">🎉 Bạn đã trả lời phiếu này rồi. Cảm ơn bạn!</p>
      ) : (
        <SurveyForm
          surveyId={found.survey.id}
          questions={found.survey.questions}
          supportCards={{
            urgent: <SupportCard tone="urgent" />,
            gentle: <SupportCard />,
            urgentNotified: <SupportCard tone="urgent" teacherNotified />,
            gentleNotified: <SupportCard teacherNotified />,
          }}
        />
      )}
    </div>
  );
}
