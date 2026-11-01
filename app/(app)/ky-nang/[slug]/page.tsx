import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { practiceOverview } from "@/lib/practice/server";
import { skillFromSlug } from "@/lib/practice/shared";
import { CASEL, subskill } from "@/lib/sel/casel";
import { casesForSkill, SKILLS } from "@/lib/skills";
import { SupportCard } from "@/components/SupportCard";
import { ArrowLeft } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { NotReady } from "../../luyen/NotReady";
import { SkillStart } from "../../luyen/[skill]/SkillStart";

export const metadata: Metadata = { title: "Luyện kỹ năng" };

const FROM = { chat: "chat", "bai-doc": "library", "nhat-ky": "journal", "tam-trang": "checkin", "trang-chu": "home" } as const;

/**
 * Mở bài luyện một kỹ năng thành phần (/ky-nang/<slug>): mục tiêu luyện chính, năng lực CASEL, rồi chọn tình huống.
 * `?tu=` chỉ ghi nguồn (trò chuyện, bài đọc, nhật ký…) cho nhật ký đợt thử; không mang nội dung nào theo.
 */
export default async function SkillStartPage({ params, searchParams }: PageProps<"/ky-nang/[slug]">) {
  const { slug } = await params;
  const skill = skillFromSlug(slug);
  if (!skill) notFound();
  // đường cũ hoặc mã kỹ năng: đưa về đúng đường của kỹ năng
  const canonical = subskill(skill).slug;
  const { tu } = await searchParams;
  if (slug !== canonical) redirect(`/ky-nang/${canonical}${typeof tu === "string" ? `?tu=${encodeURIComponent(tu)}` : ""}`);
  const from = typeof tu === "string" && tu in FROM ? FROM[tu as keyof typeof FROM] : "skills";

  const profile = await requireProfile();
  const { ready } = await practiceOverview(profile.id);
  const s = SKILLS[skill];
  const sub = subskill(skill);

  return (
    <div className="space-y-5">
      <Link href="/ky-nang" className={cn(btn.ghost, "-ml-3")}>
        <ArrowLeft size={18} /> Kỹ năng
      </Link>
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">
          {s.emoji} {CASEL[sub.primary].name}
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">{s.name}</h1>
        <p className="mt-2 max-w-2xl">
          <span className="font-semibold">Mục tiêu: </span>
          {sub.objective}
        </p>
      </header>
      {ready ? (
        <SkillStart
          skill={skill}
          from={from}
          cases={casesForSkill(skill).map((c) => ({ code: c.code, sign: c.sign, situation: c.situation }))}
          supportCards={{ urgent: <SupportCard tone="urgent" />, urgentNotified: <SupportCard tone="urgent" teacherNotified /> }}
        />
      ) : (
        <NotReady />
      )}
    </div>
  );
}
