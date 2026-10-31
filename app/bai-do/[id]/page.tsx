import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { isTestOnlyClass } from "@/lib/bai-do-server";
import { surveyForStudent } from "@/lib/surveys-server";
import { SupportCard } from "@/components/SupportCard";
import { ArrowLeft } from "@/components/ui/icons";
import { btn, pill } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { SurveyForm } from "@/app/(app)/survey/[id]/SurveyForm";

export const metadata: Metadata = { title: "Bài đo kỹ năng" };

/** Làm một bài đo: chỉ mở được đúng đề app đã giao cho học sinh ở lần đo đang mở. */
export default async function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const profile = await requireProfile();
  const found = await surveyForStudent(profile, id);
  if (!found || found.survey.kind !== "test") notFound();
  // lớp "chỉ làm bài đo" không mở được trang Cần giúp, nên thẻ hỗ trợ không kèm đường dẫn tới đó
  const helpLink = !(await isTestOnlyClass(profile.class_id));

  return (
    <div>
      <Link href="/bai-do" className={cn(btn.ghost, "-ml-3 mb-2")}>
        <ArrowLeft size={18} /> Bài đo
      </Link>
      <span className={pill}>Bài đo kỹ năng</span>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">{found.survey.title}</h1>
      {found.survey.description && <p className="mt-3 whitespace-pre-wrap leading-relaxed text-muted">{found.survey.description}</p>}

      {found.answered ? (
        <p className="mt-6 rounded-3xl bg-mint p-6 text-center font-semibold">Em đã nộp bài này rồi. Cảm ơn em!</p>
      ) : (
        <SurveyForm
          surveyId={found.survey.id}
          questions={found.survey.questions}
          kind="test"
          userId={profile.id}
          startedAt={new Date().toISOString()}
          supportCards={{
            urgent: <SupportCard tone="urgent" helpLink={helpLink} />,
            gentle: <SupportCard helpLink={helpLink} />,
            urgentNotified: <SupportCard tone="urgent" teacherNotified helpLink={helpLink} />,
            gentleNotified: <SupportCard teacherNotified helpLink={helpLink} />,
          }}
        />
      )}
    </div>
  );
}
