import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { loadSession, sampleFor, usedCaseCodes, viewOf } from "@/lib/practice/server";
import { suggestNextCase } from "@/lib/practice/review";
import { SupportCard } from "@/components/SupportCard";
import { ArrowLeft } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { NotReady } from "../../NotReady";
import { PracticeView } from "./PracticeView";

export const metadata: Metadata = { title: "Bài luyện" };

/** Một bài luyện (chỉ chủ bài mở được): Hiểu → Mẫu → Tự làm → Góp ý → Nhìn lại. */
export default async function PracticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const profile = await requireProfile();
  const loaded = await loadSession(profile.id, id);
  if (loaded === "missing") {
    return (
      <div className="space-y-6">
        <Link href="/ky-nang" className={cn(btn.ghost, "-ml-3")}>
          <ArrowLeft size={18} /> Luyện kỹ năng
        </Link>
        <NotReady />
      </div>
    );
  }
  if (!loaded) notFound();
  const view = viewOf(loaded);
  // mục 4.2: luyện xong thì gợi ý một tình huống mẫu KHÁC cùng kỹ năng để dùng lại cách vừa luyện
  const [used, sample] = await Promise.all([usedCaseCodes(profile.id, view.skill), sampleFor(profile.id, loaded.session)]);
  const next = suggestNextCase(view.skill, view.caseCode, used);

  return (
    <PracticeView
      key={view.id}
      userId={profile.id}
      initial={view}
      nextCase={next ? { code: next.code, situation: next.situation } : null}
      sample={sample}
      supportCards={{ urgent: <SupportCard tone="urgent" />, urgentNotified: <SupportCard tone="urgent" teacherNotified /> }}
    />
  );
}
