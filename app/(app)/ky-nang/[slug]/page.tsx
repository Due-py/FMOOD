import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { readingsForSkills } from "@/lib/lessons";
import { practiceOverview } from "@/lib/practice/server";
import { skillFromSlug } from "@/lib/practice/shared";
import { CASEL, subskill } from "@/lib/sel/casel";
import { casesForSkill, SKILLS } from "@/lib/skills";
import { RightPanel } from "@/components/RightPanel";
import { SideSheetButton } from "@/components/SideSheet";
import { BeforeStartPanel } from "@/components/SkillPanels";
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
 * Panel phải "Trước khi bắt đầu" (Duy duyệt mẫu 2, 01/11): 5 bước, Bài tốt cần có, lần luyện trước; từ 1280px neo mép phải,
 * cột chọn tình huống căn giữa như bài luyện (data-chat-page); nhỏ hơn mở bằng nút dưới mục tiêu.
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
  const [{ ready, stats }, readingsBySkill] = await Promise.all([practiceOverview(profile.id), readingsForSkills([skill], profile.class_id)]);
  const readings = readingsBySkill.get(skill) ?? [];
  const s = SKILLS[skill];
  const sub = subskill(skill);

  return (
    <div data-chat-page className="mx-auto w-full max-w-3xl space-y-5">
      <Link href="/ky-nang" className={cn(btn.ghost, "-ml-3")}>
        <ArrowLeft size={18} /> Luyện kỹ năng
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
        {/* bài đọc đã duyệt nối với kỹ năng này: chiều ngược của nút "Luyện cùng AI" ở cuối bài đọc */}
        {readings.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted">Bài đọc:</span>
            {readings.map((r) => (
              <Link
                key={r.slug}
                href={`/library/${r.slug}`}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-sky px-3 py-1.5 text-sm font-semibold text-sky-ink transition hover:brightness-95"
              >
                <span aria-hidden>{r.emoji}</span> {r.title}
              </Link>
            ))}
          </div>
        )}
      </header>
      {ready && (
        <SideSheetButton icon="📋" label="Trước khi bắt đầu">
          <BeforeStartPanel skill={skill} stat={stats[skill]} />
        </SideSheetButton>
      )}
      {ready ? (
        <SkillStart
          skill={skill}
          from={from}
          cases={casesForSkill(skill).map((c) => ({ code: c.code, sign: c.sign, title: c.title ?? null, situation: c.situation }))}
          supportCards={{ urgent: <SupportCard tone="urgent" />, urgentNotified: <SupportCard tone="urgent" teacherNotified /> }}
        />
      ) : (
        <NotReady />
      )}
      {ready && (
        <RightPanel aria-label="Trước khi bắt đầu" className="hidden xl:block">
          <BeforeStartPanel skill={skill} stat={stats[skill]} />
        </RightPanel>
      )}
    </div>
  );
}
