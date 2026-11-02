import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { getMoodByDay } from "@/lib/checkins";
import { addDays, dayKey } from "@/lib/dates";
import { getGarden } from "@/lib/garden";
import { getHabits } from "@/lib/habits";
import { journalSummary } from "@/lib/journal";
import { journeyLoop } from "@/lib/loop-content";
import { moodFromEmotions } from "@/lib/mood";
import { skillJourney } from "@/lib/practice/review";
import { practiceJourney } from "@/lib/practice/server";
import { JourneyShell } from "@/components/JourneyShell";
import { Recognition } from "./Recognition";
import { SelfTrackTiles } from "./SelfTrackTiles";
import { WorrySection } from "./WorrySection";

export const metadata: Metadata = { title: "Hành trình của mình" };

/**
 * HÀNH TRÌNH, tab Tổng quan (sắp lại 01/11 tối, Duy): một sổ tiến bộ, không phải hồ sơ tâm lý; chỉ ghi lại những gì đã
 * làm. Việc cần làm ngay (hỏi lại đến hạn, bài đang dở) ở trang Hôm nay. Một menu duy nhất là hàng tab (JourneyShell),
 * không còn panel phải. Ba khối cùng một kiểu tiêu đề:
 * Tự theo dõi (4 ô tóm tắt 4 tab, bấm là mở) → Chuyện bận lòng (gom theo chủ đề) → Mình đã làm được (số đếm, kỹ năng
 * đã luyện, việc nhỏ, huy hiệu). Chỉ so với chính mình; không điểm, không xếp hạng.
 */
export default async function JourneyPage() {
  const profile = await requireProfile();
  const today = dayKey();
  const from = addDays(today, -6);
  const [loop, practice, garden, moodDays, habits, journal] = await Promise.all([
    journeyLoop(profile),
    practiceJourney(profile.id),
    getGarden(profile.id),
    getMoodByDay(profile.id, from, today),
    getHabits(profile.id),
    journalSummary(profile.id),
  ]);
  const skills = skillJourney(practice.rows);
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(from, i);
    const d = moodDays.get(day);
    return { day, mood: d ? moodFromEmotions(d.emotions) : null };
  });
  const stage = garden.plant?.stages[garden.stageIndex] ?? null;

  return (
    <JourneyShell active="/hanh-trinh">
      <div className="space-y-8 sm:space-y-9">
        <SelfTrackTiles
          data={{
            week,
            habits: { done: habits.filter((h) => h.doneToday).length, total: habits.length },
            garden: { earned: garden.earned, stage: stage && { emoji: stage.emoji, label: stage.label } },
            journal,
          }}
        />

        {loop && <WorrySection loop={loop} />}

        <Recognition loop={loop} skills={skills} practiceReady={practice.ready} />

        <p className="flex items-start gap-3 rounded-3xl bg-c1 px-4 py-3.5 text-sm text-c1-ink sm:items-center sm:px-5">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface text-[1.35rem]">
            🔒
          </span>
          <span>
            Thầy cô không đọc bài luyện và nhật ký của bạn đâu. Chỉ khi có dấu hiệu bạn đang gặp nguy hiểm, F-Mood mới báo thầy cô để
            giúp bạn.
          </span>
        </p>
      </div>
    </JourneyShell>
  );
}
