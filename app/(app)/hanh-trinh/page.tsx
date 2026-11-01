import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { followupLoop, journeyLoop } from "@/lib/loop-content";
import { skillJourney } from "@/lib/practice/review";
import { practiceFollowup, practiceJourney, practiceOverview } from "@/lib/practice/server";
import { STEP_LABEL } from "@/lib/practice/state";
import { SKILLS } from "@/lib/skills";
import { ArrowUpRight } from "@/components/ui/icons";
import { RightPanel } from "@/components/RightPanel";
import { FollowupCard } from "../home/FollowupCard";
import { PracticeFollowupCard } from "../home/PracticeFollowupCard";
import { JourneyView } from "./JourneyView";
import { SkillJourney } from "./SkillJourney";

export const metadata: Metadata = { title: "Hành trình của mình" };

const SELF_TRACK = [
  { href: "/tam-trang", emoji: "☁️", label: "Tâm trạng", note: "Theo ngày, theo năm" },
  { href: "/nhat-ky", emoji: "📓", label: "Nhật ký", note: "Viết cho chính mình" },
  { href: "/habits", emoji: "✅", label: "Thói quen", note: "Việc nhỏ mỗi ngày" },
  { href: "/garden", emoji: "🌱", label: "Khu vườn", note: "Cây của bạn" },
];

/**
 * HÀNH TRÌNH (giao diện 01/11, kế hoạch V2 mục 2.5, 3.5, 11.4): một sổ tiến bộ học tập, không phải hồ sơ tâm lý.
 * Thứ tự: việc nhỏ đến hạn (học sinh tự báo) → bài đang dở → đã tự luyện (thẻ minh chứng) → chuyện bận lòng đã gỡ →
 * mục phụ tự theo dõi (Tâm trạng, Nhật ký, Thói quen, Khu vườn). Chỉ so với chính mình; không điểm, không xếp hạng.
 */
export default async function JourneyPage() {
  const profile = await requireProfile();
  const [loop, due, practice, overview] = await Promise.all([
    journeyLoop(profile),
    followupLoop(profile),
    practiceJourney(profile.id),
    practiceOverview(profile.id),
  ]);
  const practiceDue = due ? null : await practiceFollowup(profile.id);
  const skills = skillJourney(practice.rows);

  return (
    <div className="space-y-5">
      <div className="min-w-0 max-w-3xl space-y-5">
        <header>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Hành trình của mình</h1>
          <p className="mt-1 text-muted">Những bước bạn đã đi. Chỉ so với chính bạn hôm trước, không điểm, không xếp hạng.</p>
        </header>

        {(due || practiceDue) && (
          <section aria-labelledby="viec-nho" className="space-y-2">
            <h2 id="viec-nho" className="font-display text-xl font-bold tracking-tight">
              Việc nhỏ đến hạn <span className="text-sm font-normal text-muted">(bạn tự báo)</span>
            </h2>
            {due && <FollowupCard loop={due} />}
            {practiceDue && <PracticeFollowupCard followup={practiceDue} />}
          </section>
        )}

        {overview.open.length > 0 && (
          <section aria-labelledby="dang-do" className="space-y-2">
            <h2 id="dang-do" className="font-display text-xl font-bold tracking-tight">
              Đang làm dở
            </h2>
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
              {overview.open.map((o) => (
                <li key={o.id}>
                  <Link href={`/luyen/bai/${o.id}`} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-3 transition hover:border-brand-edge">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{SKILLS[o.skill].name}</span>
                      <span className="block text-sm text-muted">Dừng ở bước {STEP_LABEL[o.step]}</span>
                    </span>
                    <ArrowUpRight size={18} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {practice.ready && <SkillJourney skills={skills} />}

        {loop && <JourneyView loop={loop} />}

        <p className="rounded-[var(--radius-card)] bg-surface-2 p-4 text-sm text-muted">
          🔒 Thầy cô không đọc bài luyện và nhật ký của bạn. Chỉ khi có dấu hiệu bạn đang gặp nguy hiểm, F-Mood mới báo thầy cô để giúp.
        </p>
      </div>

      <RightPanel aria-labelledby="tu-theo-doi" className="max-w-3xl space-y-2 xl:max-w-none">
        <h2 id="tu-theo-doi" className="text-sm font-semibold uppercase tracking-wide text-muted">
          Tự theo dõi
        </h2>
        <ul className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 xl:grid-cols-1">
          {SELF_TRACK.map((t) => (
            <li key={t.href}>
              <Link href={t.href} className="flex min-h-14 items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-3 transition hover:border-brand-edge">
                <span className="text-xl" aria-hidden>
                  {t.emoji}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">{t.label}</span>
                  <span className="block text-xs text-muted">{t.note}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </RightPanel>
    </div>
  );
}
