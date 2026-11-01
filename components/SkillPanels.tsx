// Panel phải của khu Kỹ năng (Duy duyệt mẫu 2 "theo ngữ cảnh", 01/11): mỗi trang một panel, cùng chuẩn chữ với panel Học cùng AI.
// Danh sách: "Tiến độ của bạn". Chọn tình huống: "Trước khi bắt đầu". Bài luyện: cột tham chiếu riêng (PracticeView).
// Từ 1280px nằm trong RightPanel; nhỏ hơn mở bằng SideSheetButton.
import Link from "next/link";
import type { SkillStat } from "@/lib/practice/server";
import { PRACTICE_STEPS, STEP_LABEL } from "@/lib/practice/state";
import { CASEL_LIST, subskillHref, SUBSKILLS } from "@/lib/sel/casel";
import { isSkillId, SKILL_IDS, SKILLS, type SkillId } from "@/lib/skills";
import { side } from "@/app/(app)/chat/[id]/side-styles";
import { cn } from "@/components/ui/cn";

type Stats = Record<SkillId, SkillStat>;

/** Một dòng mô tả cho mỗi bước của bài luyện (H-M-T-G-N). */
const STEP_HINT: Record<(typeof PRACTICE_STEPS)[number], string> = {
  H: "Vì sao cách này giúp được bạn",
  M: "Một bài mẫu có chú thích từng dòng",
  T: "Bạn tự viết cho tình huống đã chọn",
  G: "Trợ lý góp ý, bạn sửa lần 2",
  N: "Điều bạn rút ra, lần sau dùng lúc nào",
};

const when = (iso: string) => new Date(iso).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "numeric", month: "numeric" });

/** Trang danh sách: tiến độ theo 5 nhóm năng lực (mỗi vạch một bài), gợi ý bài tiếp theo, 5 bước của một bài. */
export function SkillProgressPanel({ stats }: { stats: Stats }) {
  const done = SKILL_IDS.filter((s) => stats[s].count > 0).length;
  const groups = CASEL_LIST.map((c) => {
    const ids = SUBSKILLS.filter((s) => s.primary === c.key && isSkillId(s.id)).map((s) => s.id as SkillId);
    return { c, ids, done: ids.filter((s) => stats[s].count > 0).length };
  }).filter((g) => g.ids.length > 0);
  // gợi ý: bài chưa luyện đầu tiên ở nhóm có tỉ lệ đã luyện thấp nhất; luyện hết rồi thì thôi gợi ý
  const weakest = [...groups].sort((a, b) => a.done / a.ids.length - b.done / b.ids.length)[0];
  const next = weakest?.ids.find((s) => stats[s].count === 0) ?? null;

  return (
    <>
      <div className={side.head}>
        <h2 className={side.title}>Tiến độ của bạn</h2>
        <p className={side.desc}>
          {done}/{SKILL_IDS.length} bài đã luyện ít nhất một lần.
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="Số bài đã luyện"
        aria-valuemin={0}
        aria-valuemax={SKILL_IDS.length}
        aria-valuenow={done}
        className="mx-3 h-2 overflow-hidden rounded-full bg-line"
      >
        <div className="h-full rounded-full bg-brand" style={{ width: `${(done / SKILL_IDS.length) * 100}%` }} />
      </div>
      <ul className="mt-4 space-y-3 px-3">
        {groups.map((g) => (
          <li key={g.c.key}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-semibold">{g.c.name}</span>
              <span className="shrink-0 text-xs text-muted">
                {g.done}/{g.ids.length}
              </span>
            </div>
            <div className="mt-1 flex gap-1" aria-hidden>
              {g.ids.map((s) => (
                <span key={s} title={SKILLS[s].name} className={cn("h-1.5 flex-1 rounded-full", stats[s].count > 0 ? "bg-brand-edge" : "bg-line")} />
              ))}
            </div>
          </li>
        ))}
      </ul>

      {next && (
        <section className="mt-6">
          <h3 className={side.group}>Gợi ý bài tiếp theo</h3>
          <Link href={subskillHref(next)} className={cn(side.row, "mt-1 items-start")}>
            <span aria-hidden className="w-5 shrink-0 text-center">
              {SKILLS[next].emoji}
            </span>
            <span className="min-w-0">
              <span className={side.rowTitle}>{SKILLS[next].name}</span>
              <span className={side.rowSub}>Nhóm {weakest.c.name} bạn luyện ít nhất</span>
            </span>
          </Link>
        </section>
      )}

      <section className="mt-6">
        <h3 className={side.group}>Một bài luyện có 5 bước</h3>
        <ol className="mt-1.5 space-y-1.5 px-3 text-sm">
          {PRACTICE_STEPS.map((step, i) => (
            <li key={step} className="flex gap-2">
              <span className="w-4 shrink-0 font-semibold text-brand-strong dark:text-brand">{i + 1}</span>
              <span>
                <span className="font-semibold">{STEP_LABEL[step]}</span>
                <span className="block text-xs text-muted">{STEP_HINT[step]}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

/** Trang chọn tình huống: xem trước 5 bước, "Bài tốt cần có" (biết đích trước khi chọn), lần luyện trước. */
export function BeforeStartPanel({ skill, stat }: { skill: SkillId; stat: SkillStat }) {
  return (
    <>
      <div className={side.head}>
        <h2 className={side.title}>Trước khi bắt đầu</h2>
        <p className={side.desc}>Chọn một tình huống, bài sẽ đi qua 5 bước.</p>
      </div>
      <ol className={side.list}>
        {PRACTICE_STEPS.map((step, i) => (
          <li key={step} className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm">
            <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full border border-line text-xs font-bold text-muted">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block">{STEP_LABEL[step]}</span>
              <span className="block text-xs text-muted">{STEP_HINT[step]}</span>
            </span>
          </li>
        ))}
      </ol>

      <section className="mt-6">
        <h3 className={side.group}>Bài tốt cần có</h3>
        <ul className="mt-1.5 space-y-2 px-3 text-sm">
          {SKILLS[skill].criteria.map((c) => (
            <li key={c} className="flex gap-2">
              <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-edge" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h3 className={side.group}>Lần luyện trước</h3>
        <p className={cn(side.text, "mt-1.5")}>
          {stat.count > 0
            ? `Bạn đã luyện ${stat.count} lần${stat.lastAt ? `, gần nhất ngày ${when(stat.lastAt)}` : ""}. Mỗi lần nên chọn một tình huống khác.`
            : "Bạn chưa luyện bài này."}
        </p>
      </section>
    </>
  );
}
