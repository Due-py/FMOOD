import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { getArchivedHabits, getHabits } from "@/lib/habits";
import { JourneyPanel } from "@/components/JourneyPanel";
import { PageHeader } from "@/components/PageHeader";
import { HabitBoard } from "./HabitBoard";

export const metadata: Metadata = { title: "Thói quen" };

export default async function HabitsPage() {
  const profile = await requireProfile();
  const [habits, archived] = await Promise.all([getHabits(profile.id), getArchivedHabits(profile.id)]);
  const doneCount = habits.filter((h) => h.doneToday).length;

  return (
    <>
      {/* panel Tự theo dõi: menu con của Hành trình (Duy 01/11) */}
      <JourneyPanel active="/habits" />
      <PageHeader eyebrow="Từng bước nhỏ mỗi ngày" title="Thói quen">
        {habits.length > 0 && (
          <p className="mt-2 text-muted">
            Hôm nay: <strong className="text-ink">{doneCount}</strong> / {habits.length} việc
          </p>
        )}
      </PageHeader>
      <HabitBoard habits={habits} archived={archived} />
    </>
  );
}
