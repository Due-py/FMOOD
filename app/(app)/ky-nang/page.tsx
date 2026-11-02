import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { getCaselLessons, type CaselLessonCard } from "@/lib/lessons";
import { practiceOverview } from "@/lib/practice/server";
import { PRACTICE_STEPS, STEP_LABEL } from "@/lib/practice/state";
import { CASEL_LIST, subskill, subskillHref, SUBSKILLS } from "@/lib/sel/casel";
import { isSkillId, SKILLS } from "@/lib/skills";
import { RightPanel } from "@/components/RightPanel";
import { SideSheetButton } from "@/components/SideSheet";
import { SkillProgressPanel } from "@/components/SkillPanels";
import { MascotArt } from "@/components/mascot/MascotArt";
import { cn } from "@/components/ui/cn";
import { SkillWorlds, type World } from "./SkillWorlds";

export const metadata: Metadata = { title: "Luyện kỹ năng" };

/**
 * KỸ NĂNG (giao diện 01/11, kế hoạch V2 mục 2.3, 11): 5 năng lực CASEL theo đúng thứ tự, bên trong là các kỹ năng thành phần CÓ
 * bài luyện thật (H–M–T–G–N) và bài đọc đã đăng, đã duyệt, đã được người duyệt gắn năng lực đó. Năng lực chưa có gì thì ghi
 * "Nội dung đang được bổ sung", không bài giả. Không hiện mã cũ, trạng thái duyệt hay chữ nội bộ.
 *
 * Giao diện vui (Duy duyệt mẫu 2, 02/11): nhân vật chào bằng bong bóng lời; thẻ "Bạn đang luyện dở" như tấm vé có 5 chấm bước;
 * 5 ô "thế giới kỹ năng" theo màu nhóm (tên thân thiện to, tên bản dịch An Hòa nhỏ, sao ★☆ cho bài đã thử); nhóm đang chọn
 * hiện bài luyện thành thẻ màu lớn và "Góc đọc thêm" gấp sẵn theo chủ đề Oxford (SkillWorlds).
 * Panel phải "Bông hoa của bạn" (SkillProgressPanel): từ 1280px neo mép phải; nhỏ hơn mở bằng nút dưới thẻ luyện dở.
 */

const TOPIC_EMOJI: Record<string, string> = {
  "Chăm sóc cơ thể": "🏃",
  "Chăm sóc tâm trí": "🧠",
  "Chăm sóc các mối quan hệ": "💞",
  "Chăm sóc bản thân và thế giới": "🌏",
};
/** tên chủ đề ngắn trên nút ("Chăm sóc cơ thể" → "Cơ thể") */
const shortTopic = (t: string) => t.replace(/^Chăm sóc (các )?/, "").replace(/^./, (c) => c.toUpperCase());

/** Theo thứ tự "Chủ đề N" của bộ bài; chủ đề không có số (bài tự soạn) xếp cuối. */
function byTopic(readings: CaselLessonCard[]) {
  const map = new Map<string, CaselLessonCard[]>();
  for (const l of readings) map.set(l.topic, [...(map.get(l.topic) ?? []), l]);
  const order = (list: CaselLessonCard[]) => Math.min(...list.map((l) => Number(/Chủ đề (\d+)/.exec(l.unit)?.[1] ?? 99)));
  return [...map].sort((a, b) => order(a[1]) - order(b[1]));
}

export default async function SkillsPage() {
  const profile = await requireProfile();
  const [{ stats, open }, lessons] = await Promise.all([practiceOverview(profile.id), getCaselLessons()]);
  const resume = open[0] ?? null;

  const worlds: World[] = CASEL_LIST.map((c) => ({
    key: c.key,
    friendly: c.friendly,
    name: c.name,
    emoji: c.emoji,
    tone: c.tone,
    skills: SUBSKILLS.filter((s) => s.primary === c.key && isSkillId(s.id)).flatMap((s) =>
      isSkillId(s.id) ? [{ id: s.id, name: s.name, emoji: SKILLS[s.id].emoji, objective: s.objective, count: stats[s.id].count, href: subskillHref(s.id) }] : [],
    ),
    topics: byTopic(lessons.filter((l) => l.casel_primary === c.key)).map(([topic, list]) => ({
      topic: shortTopic(topic),
      emoji: TOPIC_EMOJI[topic] ?? "📄",
      readings: list.map((l) => ({
        id: l.id,
        slug: l.slug,
        title: l.title,
        emoji: l.emoji,
        grade: l.grade,
        skillName: l.subskill && isSkillId(l.subskill) ? subskill(l.subskill).name : null,
      })),
    })),
  }));
  // mở sẵn nhóm của bài đang luyện dở; không có thì nhóm đầu
  const resumeGroup = resume ? CASEL_LIST.findIndex((c) => c.key === SUBSKILLS.find((s) => s.id === resume.skill)?.primary) : -1;
  const stepIndex = resume ? PRACTICE_STEPS.indexOf(resume.step) : -1;

  return (
    <div data-chat-page className="mx-auto w-full max-w-3xl space-y-6">
      <header className="flex items-end gap-1">
        <MascotArt size={92} className="-mb-1 hidden sm:block" />
        <MascotArt size={64} className="-mb-1 sm:hidden" />
        <div className="mb-5 min-w-0 rounded-[1.375rem] rounded-bl-md bg-surface px-4 py-3 shadow-soft sm:px-5">
          <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">Hôm nay mình luyện gì nè, {profile.nickname}?</h1>
          <p className="mt-0.5 text-sm text-muted">Chọn một kỹ năng bạn thích. Có tình huống mẫu, không cần kể chuyện riêng đâu.</p>
        </div>
      </header>

      {resume && (
        <section className="flex flex-wrap items-center gap-4 rounded-[1.6rem] border-2 border-dashed border-brand-edge/40 bg-brand-soft px-4 py-4 sm:flex-nowrap sm:px-5">
          <span aria-hidden className="grid size-14 shrink-0 -rotate-6 place-items-center rounded-[1.25rem] bg-surface text-3xl shadow-soft">
            {SKILLS[resume.skill].emoji}
          </span>
          <div className="min-w-0 flex-1">
            <span className="inline-block rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold text-brand-strong">Bạn đang luyện dở</span>
            <p className="mt-1 font-display text-xl font-bold leading-tight">{SKILLS[resume.skill].name}</p>
            <ol className="mt-2 flex items-center" aria-label={`Đang ở bước ${STEP_LABEL[resume.step]}`}>
              {PRACTICE_STEPS.map((st, i) => (
                <li key={st} className="flex items-center">
                  {i > 0 && <span aria-hidden className={cn("h-0.5 w-3 sm:w-4", i <= stepIndex ? "bg-brand-edge" : "bg-brand-edge/30")} />}
                  <span
                    aria-hidden
                    title={STEP_LABEL[st]}
                    className={cn(
                      "grid size-6 place-items-center rounded-full border-2 text-[11px] font-bold",
                      i < stepIndex && "border-brand-edge bg-brand-edge text-surface",
                      i === stepIndex && "scale-110 border-brand-edge bg-brand text-brand-ink",
                      i > stepIndex && "border-brand-edge/40 bg-surface text-muted",
                    )}
                  >
                    {i < stepIndex ? "✓" : i + 1}
                  </span>
                </li>
              ))}
              <li className="ml-2 text-xs font-semibold text-brand-strong">Tới bước {STEP_LABEL[resume.step]} rồi!</li>
            </ol>
          </div>
          <Link
            href={`/luyen/bai/${resume.id}`}
            className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border-2 border-brand-edge bg-brand px-5 font-bold text-brand-ink shadow-[0_3px_0_var(--brand-edge)] transition active:translate-y-0.5 active:shadow-[0_1px_0_var(--brand-edge)] sm:w-auto"
          >
            Luyện tiếp nào →
          </Link>
        </section>
      )}

      <SideSheetButton icon="🌸" label="Bông hoa của bạn">
        <SkillProgressPanel stats={stats} />
      </SideSheetButton>

      <SkillWorlds worlds={worlds} initial={Math.max(0, resumeGroup)} />

      <RightPanel aria-label="Bông hoa kỹ năng" className="hidden xl:block">
        <SkillProgressPanel stats={stats} />
      </RightPanel>
    </div>
  );
}

