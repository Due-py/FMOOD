import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { getGarden } from "@/lib/garden";
import { followupLoop, journeyLoop } from "@/lib/loop-content";
import { skillJourney } from "@/lib/practice/review";
import { practiceFollowup, practiceJourney, practiceOverview } from "@/lib/practice/server";
import { STEP_LABEL } from "@/lib/practice/state";
import { SKILLS } from "@/lib/skills";
import { ArrowUpRight } from "@/components/ui/icons";
import { JourneyPanel } from "@/components/JourneyPanel";
import { FollowupCard } from "../home/FollowupCard";
import { PracticeFollowupCard } from "../home/PracticeFollowupCard";
import { Recognition } from "./Recognition";
import { Empty, Section } from "./Section";
import { SkillJourney } from "./SkillJourney";
import { WorrySection } from "./WorrySection";

export const metadata: Metadata = { title: "Hành trình của mình" };

/**
 * HÀNH TRÌNH (sắp lại 01/11): một sổ tiến bộ, không phải hồ sơ tâm lý. Bốn khối cố định, cùng một kiểu tiêu đề:
 * Cần làm bây giờ (hỏi lại đến hạn + bài đang dở) → Kỹ năng đã luyện (mỗi kỹ năng một dòng, bấm mở thẻ minh chứng) →
 * Chuyện bận lòng (thẻ gọn, chi tiết gập lại) → Ghi nhận (luyện, việc nhỏ, giọt nước, huy hiệu).
 * Panel phải là lối duy nhất sang Tâm trạng, Nhật ký, Thói quen, Khu vườn. Chỉ so với chính mình; không điểm, không xếp hạng.
 */
export default async function JourneyPage() {
  const profile = await requireProfile();
  const [loop, due, practice, overview, garden] = await Promise.all([
    journeyLoop(profile),
    followupLoop(profile),
    practiceJourney(profile.id),
    practiceOverview(profile.id),
    getGarden(profile.id),
  ]);
  const practiceDue = due ? null : await practiceFollowup(profile.id);
  const skills = skillJourney(practice.rows);
  const nothingDue = !due && !practiceDue && overview.open.length === 0;

  return (
    <div className="space-y-5">
      <div className="min-w-0 max-w-3xl space-y-8">
        <header>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Hành trình của mình</h1>
          <p className="mt-1 text-muted">Những bước bạn đã đi. Chỉ so với chính bạn hôm trước, không điểm, không xếp hạng.</p>
        </header>

        <Section id="can-lam" title="Cần làm bây giờ">
          {nothingDue ? (
            <Empty>Không có việc nào đang chờ bạn.</Empty>
          ) : (
            <div className="space-y-2">
              {due && <FollowupCard loop={due} />}
              {practiceDue && <PracticeFollowupCard followup={practiceDue} />}
              {overview.open.length > 0 && (
                <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
                  {overview.open.map((o) => (
                    <li key={o.id}>
                      <Link
                        href={`/luyen/bai/${o.id}`}
                        className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-3 transition hover:border-brand-edge"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold uppercase tracking-wide text-muted">Bài đang dở</span>
                          <span className="block truncate font-semibold">{SKILLS[o.skill].name}</span>
                          <span className="block text-sm text-muted">Dừng ở bước {STEP_LABEL[o.step]}</span>
                        </span>
                        <ArrowUpRight size={18} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Section>

        {practice.ready && <SkillJourney skills={skills} />}

        {loop && <WorrySection loop={loop} />}

        <Recognition loop={loop} skills={skills} drops={garden.earned} />

        <p className="rounded-[var(--radius-card)] bg-surface-2 p-4 text-sm text-muted">
          🔒 Thầy cô không đọc bài luyện và nhật ký của bạn. Chỉ khi có dấu hiệu bạn đang gặp nguy hiểm, F-Mood mới báo thầy cô để giúp.
        </p>
      </div>

      <JourneyPanel />
    </div>
  );
}
