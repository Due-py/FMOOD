import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { getGarden } from "@/lib/garden";
import { journeyLoop } from "@/lib/loop-content";
import { skillJourney } from "@/lib/practice/review";
import { practiceJourney } from "@/lib/practice/server";
import { JourneyPanel } from "@/components/JourneyPanel";
import { Recognition } from "./Recognition";
import { SkillJourney } from "./SkillJourney";
import { WorrySection } from "./WorrySection";

export const metadata: Metadata = { title: "Hành trình của mình" };

/**
 * HÀNH TRÌNH (sắp lại 01/11): một sổ tiến bộ, không phải hồ sơ tâm lý; chỉ ghi lại những gì đã làm. Việc cần làm ngay
 * (hỏi lại đến hạn, bài đang dở) ở trang Hôm nay. Ba khối cố định, cùng một kiểu tiêu đề:
 * Kỹ năng đã luyện (mỗi kỹ năng một dòng, bấm mở thẻ minh chứng) → Chuyện bận lòng (thẻ gọn, chi tiết gập lại) →
 * Ghi nhận (luyện, việc nhỏ, giọt nước, huy hiệu).
 * Panel phải là lối duy nhất sang Tâm trạng, Nhật ký, Thói quen, Khu vườn. Chỉ so với chính mình; không điểm, không xếp hạng.
 */
export default async function JourneyPage() {
  const profile = await requireProfile();
  const [loop, practice, garden] = await Promise.all([journeyLoop(profile), practiceJourney(profile.id), getGarden(profile.id)]);
  const skills = skillJourney(practice.rows);

  return (
    <div className="space-y-5">
      <div className="min-w-0 max-w-3xl space-y-8">
        <header>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Hành trình của mình</h1>
          <p className="mt-1 text-muted">Những bước bạn đã đi. Chỉ so với chính bạn hôm trước, không điểm, không xếp hạng.</p>
        </header>

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
