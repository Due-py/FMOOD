import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { getArchivedHabits, getHabits } from "@/lib/habits";
import { JourneyShell } from "@/components/JourneyShell";
import { HabitBoard } from "./HabitBoard";

export const metadata: Metadata = { title: "Thói quen" };

export default async function HabitsPage() {
  const profile = await requireProfile();
  const [habits, archived] = await Promise.all([getHabits(profile.id), getArchivedHabits(profile.id)]);
  const doneCount = habits.filter((h) => h.doneToday).length;

  return (
    <JourneyShell active="/habits">
      <p className="mb-6 text-muted">
        Từng bước nhỏ mỗi ngày.
        {habits.length > 0 && (
          <>
            {" "}
            Hôm nay: <strong className="text-ink">{doneCount}</strong> / {habits.length} việc
          </>
        )}
      </p>
      <HabitBoard habits={habits} archived={archived} />
    </JourneyShell>
  );
}
