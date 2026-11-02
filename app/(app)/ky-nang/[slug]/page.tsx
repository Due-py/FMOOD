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
import { cn } from "@/components/ui/cn";
import { BackPill } from "../../luyen/vui";
import { NotReady } from "../../luyen/NotReady";
import { SkillStart } from "../../luyen/[skill]/SkillStart";

export const metadata: Metadata = { title: "Luyện kỹ năng" };

const FROM = {
  chat: "chat",
  "bai-doc": "library",
  "nhat-ky": "journal",
  "tam-trang": "checkin",
  "trang-chu": "home",
} as const;

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

  const c = CASEL[sub.primary];

  return (
    <div data-chat-page className={cn("mx-auto w-full max-w-3xl space-y-5", `tone-${c.tone}`)}>
      <BackPill />
      {/* đầu trang theo màu nhóm năng lực (mẫu giao diện vui 02/11): tên thân thiện to, tên bản dịch nhỏ */}
      <header className="relative flex flex-col gap-3 rounded-[28px] bg-tint px-4 py-5 sm:flex-row sm:items-start sm:gap-5 sm:px-6">
        <span
          aria-hidden
          className="absolute -top-2.5 right-4 grid size-14 shrink-0 -rotate-6 place-items-center rounded-[18px] bg-surface text-3xl shadow-soft sm:static sm:size-[68px] sm:rounded-[22px] sm:text-4xl"
        >
          {s.emoji}
        </span>
        <div className="min-w-0">
          <p className="inline-flex flex-wrap items-center gap-x-1.5 rounded-full bg-surface px-3 py-0.5 text-xs text-tink">
            <span className="font-bold">
              <span aria-hidden>{c.emoji} </span>
              {c.friendly}
            </span>
            <span aria-hidden>·</span>
            <span className="font-medium">{c.name}</span>
          </p>
          <h1 className="mt-1.5 pr-14 font-display text-[26px] font-extrabold leading-[1.1] text-tink sm:pr-0 sm:text-[32px]">{s.name}</h1>
          <p className="mt-2 flex flex-col gap-0.5 rounded-2xl bg-surface/70 px-3 py-2 text-sm sm:flex-row sm:gap-2">
            <span className="shrink-0 font-bold">
              <span aria-hidden>🎯 </span>Mục tiêu:
            </span>
            <span>{sub.objective}</span>
          </p>
          {/* bài đọc đã duyệt nối với kỹ năng này: chiều ngược của nút "Luyện cùng AI" ở cuối bài đọc */}
          {readings.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-0.5 text-sm font-semibold text-tink">
                <span aria-hidden>📚 </span>Bài đọc:
              </span>
              {readings.map((r) => (
                <Link
                  key={r.slug}
                  href={`/library/${r.slug}`}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-sky px-3 py-1.5 text-[13px] font-semibold text-sky-ink transition hover:-translate-y-0.5 motion-reduce:transform-none"
                >
                  <span aria-hidden>{r.emoji}</span> {r.title}
                </Link>
              ))}
            </div>
          )}
        </div>
      </header>
      {ready && (
        <SideSheetButton icon="📋" label="Trước khi bắt đầu" className="shadow-soft">
          <BeforeStartPanel skill={skill} stat={stats[skill]} />
        </SideSheetButton>
      )}
      {ready ? (
        <SkillStart
          skill={skill}
          from={from}
          nickname={profile.nickname}
          cases={casesForSkill(skill).map((c) => ({
            code: c.code,
            sign: c.sign,
            title: c.title ?? null,
            situation: c.situation,
          }))}
          supportCards={{
            urgent: <SupportCard tone="urgent" />,
            urgentNotified: <SupportCard tone="urgent" teacherNotified />,
          }}
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
