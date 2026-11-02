// Panel phải của khu Kỹ năng (Duy duyệt mẫu 2 "theo ngữ cảnh", 01/11): mỗi trang một panel, cùng chuẩn chữ với panel Học cùng AI.
// Danh sách: "Bạn đã luyện". Chọn tình huống: "Trước khi bắt đầu". Bài luyện: cột tham chiếu riêng (PracticeView).
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

/** Trang danh sách: bông hoa 5 cánh theo 5 nhóm năng lực, gợi ý bài tiếp theo, 5 bước của một bài. */
/** `skills`: bài đang mở cho học sinh (đã thẩm định); mặc định cả 16 bài. */
export function SkillProgressPanel({ stats, skills = SKILL_IDS }: { stats: Stats; skills?: readonly SkillId[] }) {
  const done = skills.filter((s) => stats[s].count > 0).length;
  const petals = CASEL_LIST.map((c) => {
    const ids = SUBSKILLS.filter((s) => s.primary === c.key && isSkillId(s.id) && skills.includes(s.id)).map((s) => s.id as SkillId);
    return { c, ids, done: ids.filter((s) => stats[s].count > 0).length };
  });
  const groups = petals.filter((g) => g.ids.length > 0);
  // gợi ý: bài chưa luyện đầu tiên ở nhóm có tỉ lệ đã luyện thấp nhất; luyện hết rồi thì thôi gợi ý
  const weakest = [...groups].sort((a, b) => a.done / a.ids.length - b.done / b.ids.length)[0];
  const next = weakest?.ids.find((s) => stats[s].count === 0) ?? null;

  return (
    <>
      <div className={side.head}>
        <h2 className={side.title}>Bạn đã luyện</h2>
        <p className={side.desc}>
          {done}/{skills.length} bài đã luyện ít nhất một lần.
        </p>
      </div>
      <Flower petals={petals} done={done} total={skills.length} />
      <ul className="mt-3 space-y-1 px-3 text-sm">
        {petals.map((g, i) => (
          <li key={g.c.key} className="flex items-baseline gap-2">
            <span aria-hidden className="w-4 shrink-0 font-semibold text-brand-strong dark:text-brand">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">{g.c.name}</span>
            <span className="shrink-0 text-xs text-muted">{g.ids.length ? `${g.done}/${g.ids.length}` : "Sắp có"}</span>
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

// Bông hoa 5 cánh (Duy chọn 02/11 thay các vạch, vì danh sách bên trái đã ghi "x/y đã luyện"): mỗi cánh một năng lực theo
// đúng số thứ tự ở danh sách, cánh dài dần theo tỉ lệ bài đã luyện ít nhất một lần. Viền đứt là cả cánh; cùng một màu bơ
// (bảng màu chỉ có một màu hành động), phân biệt cánh bằng số ở đầu cánh và danh sách bên dưới.
const CORE = 24;
const TIP = 78;

function Flower({ petals, done, total }: { petals: { c: { key: string; name: string }; ids: SkillId[]; done: number }[]; done: number; total: number }) {
  return (
    <svg
      viewBox="-100 -102 200 186"
      role="img"
      aria-label={`Bông hoa 5 cánh: ${petals.map((g) => `${g.c.name} ${g.done}/${g.ids.length}`).join(", ")}`}
      className="mx-auto block w-full max-w-52"
    >
      {petals.map((g, i) => {
        const f = g.ids.length ? g.done / g.ids.length : 0;
        const len = CORE + (TIP - CORE) * f;
        const a = i * 72;
        return (
          <g key={g.c.key} transform={`rotate(${a})`}>
            <ellipse cy={-(CORE + TIP) / 2} rx={20} ry={(TIP - CORE) / 2 + 8} fill="none" className="stroke-brand-edge" strokeOpacity={0.45} strokeDasharray="3 3" />
            {f > 0 && <ellipse cy={-(CORE + len) / 2} rx={12 + 8 * f} ry={(len - CORE) / 2 + 8} className="fill-brand stroke-brand-edge" />}
            <text transform={`translate(0 ${-TIP - 12}) rotate(${-a})`} textAnchor="middle" dominantBaseline="middle" className="fill-muted text-[11px] font-semibold">
              {i + 1}
            </text>
          </g>
        );
      })}
      <circle r={CORE} className="fill-brand-soft stroke-brand-edge" />
      <text y={-3} textAnchor="middle" className="fill-brand-strong font-display text-[15px] font-extrabold dark:fill-brand">
        {done}/{total}
      </text>
      <text y={11} textAnchor="middle" className="fill-muted text-[9px]">
        bài
      </text>
    </svg>
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
