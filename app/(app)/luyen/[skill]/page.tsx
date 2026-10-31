import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { latestDifficulty, practiceOverview } from "@/lib/practice/server";
import { skillFromSlug } from "@/lib/practice/shared";
import { casesForSkill, SKILLS } from "@/lib/skills";
import { SupportCard } from "@/components/SupportCard";
import { ArrowLeft } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { NotReady } from "../NotReady";
import { SkillStart } from "./SkillStart";

export const metadata: Metadata = { title: "Thực hành kỹ năng" };

/** Chọn tình huống để luyện một kỹ năng: tình huống của mình (điền sẵn khó khăn đã xác nhận gần nhất) hoặc tình huống mẫu. */
export default async function SkillPage({ params }: { params: Promise<{ skill: string }> }) {
  const skill = skillFromSlug((await params).skill);
  if (!skill) notFound();
  const profile = await requireProfile();
  const [{ ready }, difficulty] = await Promise.all([practiceOverview(profile.id), latestDifficulty(profile.id)]);
  const s = SKILLS[skill];

  return (
    <div className="space-y-6">
      <Link href="/luyen" className={cn(btn.ghost, "-ml-3")}>
        <ArrowLeft size={18} /> Luyện kỹ năng
      </Link>
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">
          {s.emoji} {skill} · {s.name}
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">{s.suggestName}</h1>
        <p className="mt-2 max-w-xl text-muted">{s.tagline}</p>
      </header>
      {ready ? (
        <SkillStart
          skill={skill}
          cases={casesForSkill(skill).map((c) => ({ code: c.code, sign: c.sign, situation: c.situation }))}
          prefill={difficulty}
          supportCards={{ urgent: <SupportCard tone="urgent" />, urgentNotified: <SupportCard tone="urgent" teacherNotified /> }}
        />
      ) : (
        <NotReady />
      )}
    </div>
  );
}
