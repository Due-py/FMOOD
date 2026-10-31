import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { practiceOverview } from "@/lib/practice/server";
import { skillHref } from "@/lib/practice/shared";
import { STATE_LABEL, STEP_LABEL } from "@/lib/practice/state";
import { caseByCode, SKILL_CODES, SKILLS } from "@/lib/skills";
import { PageHeader } from "@/components/PageHeader";
import { RoundArrow } from "@/components/ui/ArrowLink";
import { card, cardHover } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { NotReady } from "./NotReady";

export const metadata: Metadata = { title: "Luyện kỹ năng" };

const TONES = ["bg-sky", "bg-mint", "bg-butter", "bg-peach"];

const when = (iso: string) =>
  new Date(iso).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "numeric", month: "numeric" });

/** Trang Luyện kỹ năng: 4 kỹ năng K1–K4, mỗi thẻ ghi đã luyện mấy lần, lần gần nhất; bài còn dở để làm tiếp. */
export default async function PracticeHome() {
  const profile = await requireProfile();
  const { ready, stats, open } = await practiceOverview(profile.id);

  return (
    <div className="fm-stagger space-y-6">
      <PageHeader eyebrow="Luyện kỹ năng" title="Luyện trước, dùng khi cần">
        <p className="mt-3 max-w-xl text-muted">
          Không cần đang căng thẳng mới luyện. Chọn một kỹ năng, dùng tình huống của bạn hoặc một tình huống mẫu, rồi tự làm từng bước. Bài bạn viết chỉ
          mình bạn xem được.
        </p>
      </PageHeader>

      {!ready && <NotReady />}

      {ready && open.length > 0 && (
        <section aria-labelledby="dang-do" className="rounded-[var(--radius-card)] border-2 border-dashed border-line p-4">
          <h2 id="dang-do" className="font-display text-lg font-bold tracking-tight">
            Bài đang dở
          </h2>
          <ul className="mt-3 space-y-2">
            {open.map((o) => (
              <li key={o.id}>
                <Link href={`/luyen/bai/${o.id}`} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 transition hover:bg-surface">
                  <span className="text-xl" aria-hidden>
                    {SKILLS[o.skill].emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{SKILLS[o.skill].name}</span>
                    <span className="block truncate text-sm text-muted">
                      {caseByCode(o.caseCode)?.situation ?? "Tình huống của bạn"} · {STATE_LABEL[o.state]} · bước {STEP_LABEL[o.step]}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-brand-strong dark:text-brand">Làm tiếp</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {SKILL_CODES.map((code, i) => {
          const s = SKILLS[code];
          const st = stats[code];
          return (
            <Link key={code} href={skillHref(code)} className={cn(card, cardHover, "flex flex-col")}>
              <span className={cn("flex size-12 items-center justify-center rounded-full text-2xl", TONES[i])} aria-hidden>
                {s.emoji}
              </span>
              <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted">
                {code} · {s.name}
              </p>
              <h2 className="font-display text-xl font-bold tracking-tight">{s.suggestName}</h2>
              <p className="mt-1 flex-1 text-sm text-muted">{s.tagline}</p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-sm text-muted">
                  {st.count ? `Đã luyện ${st.count} lần · gần nhất ${when(st.lastAt!)}` : "Chưa luyện lần nào"}
                </span>
                <RoundArrow />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
