import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { getCaselLessons, type CaselLessonCard } from "@/lib/lessons";
import { practiceOverview } from "@/lib/practice/server";
import { STEP_LABEL } from "@/lib/practice/state";
import { CASEL_LIST, subskill, subskillHref, SUBSKILLS } from "@/lib/sel/casel";
import { isSkillId, SKILL_IDS, SKILLS } from "@/lib/skills";
import { RightPanel } from "@/components/RightPanel";
import { SideSheetButton } from "@/components/SideSheet";
import { SkillProgressPanel } from "@/components/SkillPanels";
import { ArrowUpRight, ChevronDownIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Luyện kỹ năng" };

/**
 * KỸ NĂNG (giao diện 01/11, kế hoạch V2 mục 2.3, 11): 5 năng lực CASEL theo đúng thứ tự và tên bản dịch An Hòa, mỗi năng lực một
 * câu dễ hiểu; bên trong là các kỹ năng thành phần CÓ bài luyện thật (H–M–T–G–N) và bài đọc đã đăng, đã duyệt, đã được người duyệt
 * gắn năng lực đó. Năng lực chưa có gì thì ghi "Nội dung đang được bổ sung", không có nút, không bài giả.
 * Không hiện mã cũ, không hiện trạng thái duyệt hay chữ nội bộ.
 *
 * Bố cục (Duy duyệt mẫu A 01/11, thu gọn theo mẫu 02/11): mỗi năng lực một khung gấp mở (<details name> nên mở khung này thì
 * khung kia tự gấp, phần 1 mở sẵn); đầu khung có "x/y đã luyện". Trong khung: bài luyện (emoji, tên đậm, một dòng mục tiêu, số lần
 * luyện), cuối khung là "Khám phá thêm" (ExploreMore bên dưới).
 * Panel phải "Bạn đã luyện" (Duy duyệt mẫu 2, 01/11): từ 1280px neo mép phải, cột danh sách căn giữa như bài luyện
 * (data-chat-page); nhỏ hơn mở bằng nút dưới tiêu đề.
 */
export default async function SkillsPage() {
  const profile = await requireProfile();
  const [{ stats, open }, lessons] = await Promise.all([practiceOverview(profile.id), getCaselLessons()]);
  const resume = open[0] ?? null;

  return (
    <div data-chat-page className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Luyện kỹ năng</h1>
        <p className="mt-1 text-muted">
          {SKILL_IDS.length} bài luyện theo 5 nhóm năng lực. Có tình huống mẫu, không cần kể chuyện riêng.
        </p>
      </header>

      <SideSheetButton icon="📊" label="Bạn đã luyện">
        <SkillProgressPanel stats={stats} />
      </SideSheetButton>

      {resume && (
        <Link href={`/luyen/bai/${resume.id}`} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-brand-edge bg-brand-soft p-4">
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-xl">
            {SKILLS[resume.skill].emoji}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-muted">Làm tiếp</span>
            <span className="block truncate font-semibold">{SKILLS[resume.skill].name}</span>
            <span className="block text-sm text-muted">Bạn dừng ở bước {STEP_LABEL[resume.step]}</span>
          </span>
          <ArrowUpRight size={18} />
        </Link>
      )}

      <div className="space-y-2">
        {CASEL_LIST.map((c, i) => {
          const practice = SUBSKILLS.filter((s) => s.primary === c.key && isSkillId(s.id));
          const readings = lessons.filter((l) => l.casel_primary === c.key);
          const done = practice.filter((s) => isSkillId(s.id) && stats[s.id].count > 0).length;
          return (
            <details key={c.key} name="nang-luc" open={i === 0} className="group/nl overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 transition hover:bg-cream [&::-webkit-details-marker]:hidden">
                <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft font-display text-sm font-extrabold text-brand-strong">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <h2 id={`nl-${c.key}`} className="font-display text-lg font-bold tracking-tight">
                    {c.name}
                  </h2>
                  <span className="block text-sm text-muted">{c.plain}</span>
                </span>
                {practice.length > 0 && (
                  <span className="hidden shrink-0 text-xs font-semibold text-muted sm:block">
                    {done}/{practice.length} đã luyện
                  </span>
                )}
                <ChevronDownIcon size={18} className="shrink-0 text-muted transition group-open/nl:rotate-180" />
              </summary>

              {practice.length === 0 && readings.length === 0 && (
                <p className="border-t border-line px-4 py-3 text-sm text-muted">Nội dung đang được bổ sung.</p>
              )}

              {practice.length > 0 && (
                <ul className="divide-y divide-line border-t border-line">
                  {practice.map((s) => {
                    if (!isSkillId(s.id)) return null;
                    const count = stats[s.id].count;
                    return (
                      <li key={s.id}>
                        <Link href={subskillHref(s.id)} className="group flex items-center gap-3 px-4 py-3 transition hover:bg-cream">
                          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-lg">
                            {SKILLS[s.id].emoji}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold">{s.name}</span>
                            <span className="block truncate text-sm text-muted">{s.objective}</span>
                          </span>
                          <span className="hidden shrink-0 text-xs font-semibold text-muted sm:block">
                            {count > 0 ? `Đã luyện ${count} lần` : "Chưa luyện"}
                          </span>
                          <ChevronDownIcon size={18} className="shrink-0 -rotate-90 text-muted transition group-hover:translate-x-0.5 group-hover:text-ink" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}

              {readings.length > 0 && <ExploreMore readings={readings} />}
            </details>
          );
        })}
      </div>

      <RightPanel aria-label="Tiến độ kỹ năng" className="hidden xl:block">
        <SkillProgressPanel stats={stats} />
      </RightPanel>
    </div>
  );
}

// "Khám phá thêm" cuối mỗi năng lực (Duy duyệt mẫu 02/11): bài đọc gấp lại, chia theo chủ đề sẵn có của bài (4 chủ đề Oxford),
// không tự đặt nhóm mới. Mỗi chủ đề mở ra 4 bài đầu, còn lại nằm sau "Xem thêm".
const TOPIC_EMOJI: Record<string, string> = {
  "Chăm sóc cơ thể": "🏃",
  "Chăm sóc tâm trí": "🧠",
  "Chăm sóc các mối quan hệ": "💞",
  "Chăm sóc bản thân và thế giới": "🌏",
};
const FIRST = 4;

/** Theo thứ tự "Chủ đề N" của bộ bài; chủ đề không có số (bài tự soạn) xếp cuối. */
function byTopic(readings: CaselLessonCard[]) {
  const map = new Map<string, CaselLessonCard[]>();
  for (const l of readings) map.set(l.topic, [...(map.get(l.topic) ?? []), l]);
  const order = (list: CaselLessonCard[]) => Math.min(...list.map((l) => Number(/Chủ đề (\d+)/.exec(l.unit)?.[1] ?? 99)));
  return [...map].sort((a, b) => order(a[1]) - order(b[1]));
}

function ReadingLink({ l }: { l: CaselLessonCard }) {
  return (
    <Link
      href={`/library/${l.slug}`}
      className="flex min-h-11 items-center gap-2 rounded-xl border border-sky bg-surface px-3 py-2 text-sm font-semibold text-sky-ink transition hover:bg-sky"
    >
      <span aria-hidden>{l.emoji}</span>
      <span className="min-w-0 flex-1 truncate">{l.title}</span>
      {l.grade && <span className="shrink-0 text-xs font-normal" title={`Lớp ${l.grade}`}>C{l.grade}</span>}
      {l.subskill && isSkillId(l.subskill) && <span className="sr-only">, có bài luyện {subskill(l.subskill).name}</span>}
    </Link>
  );
}

function ExploreMore({ readings }: { readings: CaselLessonCard[] }) {
  return (
    <details className="group/km mx-3 mb-3 mt-1 rounded-xl bg-sky px-3 py-2 text-sky-ink">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-semibold [&::-webkit-details-marker]:hidden">
        <span aria-hidden>📖</span>
        <span className="flex-1">Khám phá thêm · {readings.length} bài đọc</span>
        <ChevronDownIcon size={18} className="shrink-0 transition group-open/km:rotate-180" />
      </summary>
      <div className="space-y-1.5 pb-1">
        {byTopic(readings).map(([topic, list]) => (
          <details key={topic} className="group/cd rounded-lg bg-surface/70">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
              <span aria-hidden>{TOPIC_EMOJI[topic] ?? "📄"}</span>
              <span className="flex-1">{topic}</span>
              <span className="text-xs font-normal">{list.length} bài</span>
              <ChevronDownIcon size={16} className="shrink-0 transition group-open/cd:rotate-180" />
            </summary>
            <div className="px-2 pb-2">
              <div className="grid gap-1.5 sm:grid-cols-2">
                {list.slice(0, FIRST).map((l) => (
                  <ReadingLink key={l.id} l={l} />
                ))}
              </div>
              {list.length > FIRST && (
                <details className="group/xt">
                  <summary className="w-fit cursor-pointer list-none px-1 py-2 text-sm font-semibold underline-offset-4 hover:underline group-open/xt:hidden [&::-webkit-details-marker]:hidden">
                    Xem thêm {list.length - FIRST} bài
                  </summary>
                  <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                    {list.slice(FIRST).map((l) => (
                      <ReadingLink key={l.id} l={l} />
                    ))}
                  </div>
                </details>
              )}
            </div>
          </details>
        ))}
      </div>
    </details>
  );
}
