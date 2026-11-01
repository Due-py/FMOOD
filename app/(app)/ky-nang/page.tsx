import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { getCaselLessons } from "@/lib/lessons";
import { practiceOverview } from "@/lib/practice/server";
import { STEP_LABEL } from "@/lib/practice/state";
import { CASEL, CASEL_LIST, subskill, subskillHref, SUBSKILLS } from "@/lib/sel/casel";
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
 * Bố cục (Duy duyệt mẫu A, 01/11): bản mở rộng của thẻ Kỹ năng trong panel Học cùng AI. Cùng kiểu dòng (emoji, tên đậm, cả dòng
 * bấm được); trang rộng hơn nên thêm mục tiêu, "Cũng giúp" và số lần luyện. Mỗi năng lực một khung trắng, không thẻ lồng thẻ.
 * Panel phải "Tiến độ của bạn" (Duy duyệt mẫu 2, 01/11): từ 1280px neo mép phải, cột danh sách căn giữa như bài luyện
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

      <SideSheetButton icon="📊" label="Tiến độ của bạn">
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

      {CASEL_LIST.map((c, i) => {
        const practice = SUBSKILLS.filter((s) => s.primary === c.key && isSkillId(s.id));
        const readings = lessons.filter((l) => l.casel_primary === c.key);
        const empty = practice.length === 0 && readings.length === 0;
        return (
          <section key={c.key} aria-labelledby={`nl-${c.key}`}>
            <div className="flex items-baseline gap-3 px-1">
              <span aria-hidden className="font-display text-sm font-extrabold text-brand-strong">
                {i + 1}
              </span>
              <div className="min-w-0">
                <h2 id={`nl-${c.key}`} className="font-display text-xl font-bold tracking-tight">
                  {c.name}
                </h2>
                <p className="text-sm text-muted">{c.plain}</p>
              </div>
            </div>

            {empty && (
              <p className="mt-2 rounded-[var(--radius-card)] border border-dashed border-line px-4 py-3 text-sm text-muted">Nội dung đang được bổ sung.</p>
            )}

            {practice.length > 0 && (
              <ul className="mt-2 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
                {practice.map((s) => {
                  if (!isSkillId(s.id)) return null;
                  const count = stats[s.id].count;
                  return (
                    <li key={s.id}>
                      <Link href={subskillHref(s.id)} className="group flex items-center gap-3 px-4 py-3.5 transition hover:bg-cream">
                        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-xl">
                          {SKILLS[s.id].emoji}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">{s.name}</span>
                          <span className="block text-sm text-muted">{s.objective}</span>
                          {s.related.length > 0 && (
                            <span className="mt-1 block text-xs text-muted">Cũng giúp: {s.related.map((r) => CASEL[r].name).join(", ")}</span>
                          )}
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

            {readings.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 px-1">
                <span className="sr-only">Bài đọc liên quan:</span>
                {readings.map((l) => (
                  <Link
                    key={l.id}
                    href={`/library/${l.slug}`}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-sky px-3 py-1.5 text-sm font-semibold text-sky-ink transition hover:brightness-95"
                  >
                    <span aria-hidden>{l.emoji}</span> {l.title}
                    {l.subskill && isSkillId(l.subskill) && <span className="sr-only">, có bài luyện {subskill(l.subskill).name}</span>}
                  </Link>
                ))}
              </div>
            )}
          </section>
        );
      })}

      <RightPanel aria-label="Tiến độ kỹ năng" className="hidden xl:block">
        <SkillProgressPanel stats={stats} />
      </RightPanel>
    </div>
  );
}
