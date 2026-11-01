import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { getCaselLessons } from "@/lib/lessons";
import { practiceOverview } from "@/lib/practice/server";
import { STEP_LABEL } from "@/lib/practice/state";
import { CASEL, CASEL_LIST, subskill, subskillHref, SUBSKILLS } from "@/lib/sel/casel";
import { isSkillId, SKILLS } from "@/lib/skills";
import { ArrowUpRight } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

export const metadata: Metadata = { title: "Kỹ năng" };

/**
 * KỸ NĂNG (giao diện 01/11, kế hoạch V2 mục 2.3, 11): 5 năng lực CASEL theo đúng thứ tự và tên bản dịch An Hòa, mỗi năng lực một
 * câu dễ hiểu; bên trong là các kỹ năng thành phần CÓ bài luyện thật (H–M–T–G–N) và bài đọc đã đăng, đã duyệt, đã được người duyệt
 * gắn năng lực đó. Năng lực chưa có gì thì ghi "Nội dung đang được bổ sung", không có nút, không bài giả.
 * Không hiện mã cũ, không hiện trạng thái duyệt hay chữ nội bộ.
 */
export default async function SkillsPage() {
  const profile = await requireProfile();
  const [{ stats, open }, lessons] = await Promise.all([practiceOverview(profile.id), getCaselLessons()]);
  const resume = open[0] ?? null;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Kỹ năng</h1>
        <p className="mt-1 text-muted">Chọn một kỹ năng để luyện cùng trợ lý, hoặc đọc một bài. Có tình huống mẫu, không cần kể chuyện riêng.</p>
      </header>

      {resume && (
        <Link href={`/luyen/bai/${resume.id}`} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-brand-edge bg-brand-soft p-4">
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-muted">Làm tiếp</span>
            <span className="block truncate font-semibold">{SKILLS[resume.skill].name}</span>
            <span className="block text-sm text-muted">Bạn dừng ở bước {STEP_LABEL[resume.step]}</span>
          </span>
          <ArrowUpRight size={18} />
        </Link>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        {CASEL_LIST.map((c) => {
          const practice = SUBSKILLS.filter((s) => s.primary === c.key && isSkillId(s.id));
          const readings = lessons.filter((l) => l.casel_primary === c.key);
          const empty = practice.length === 0 && readings.length === 0;
          return (
            <section
              key={c.key}
              aria-labelledby={`nl-${c.key}`}
              className={cn("rounded-[var(--radius-card)] border p-4", empty ? "border-dashed border-line bg-surface/50" : "border-line bg-surface")}
            >
              <h2 id={`nl-${c.key}`} className="font-display text-xl font-bold tracking-tight">
                {c.name}
              </h2>
              <p className="text-sm text-muted">{c.plain}</p>

              {empty && <p className="mt-3 text-sm text-muted">Nội dung đang được bổ sung.</p>}

              {practice.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {practice.map((s) => {
                    const st = isSkillId(s.id) ? stats[s.id] : undefined;
                    return (
                      <li key={s.id} className="rounded-xl bg-surface-2 p-3">
                        <div className="flex flex-wrap items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">{s.name}</p>
                            <p className="text-sm text-muted">{s.objective}</p>
                            {s.related.length > 0 && (
                              <p className="mt-1 text-xs text-muted">Cũng giúp: {s.related.map((r) => CASEL[r].name).join(", ")}</p>
                            )}
                            {st && st.count > 0 && <p className="mt-1 text-xs text-muted">Bạn đã luyện {st.count} lần</p>}
                          </div>
                          <Link href={subskillHref(s.id)} className={cn(btn.primary, "max-w-full shrink-0 px-4 py-2 text-center text-sm")}>
                            Luyện cùng AI
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {readings.length > 0 && (
                <div className="mt-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Bài đọc liên quan</h3>
                  <ul className="mt-1.5 space-y-1.5">
                    {readings.map((l) => (
                      <li key={l.id}>
                        <Link href={`/library/${l.slug}`} className="flex min-h-11 items-center gap-3 rounded-xl bg-sky px-3 py-2 text-sky-ink transition hover:brightness-95">
                          <span aria-hidden>{l.emoji}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold">{l.title}</span>
                            {l.learning_objective && <span className="block text-xs opacity-90">{l.learning_objective}</span>}
                          </span>
                          {l.subskill && isSkillId(l.subskill) && <span className="sr-only">, có bài luyện {subskill(l.subskill).name}</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
