// Panel phải của khu Kỹ năng (Duy duyệt mẫu 2 "theo ngữ cảnh", 01/11): mỗi trang một panel, cùng chuẩn chữ với panel Học cùng AI.
// Danh sách: "Bông hoa của bạn" (giao diện vui 02/11). Chọn tình huống: "Trước khi bắt đầu". Bài luyện: cột tham chiếu riêng (PracticeView).
// Từ 1280px nằm trong RightPanel; nhỏ hơn mở bằng SideSheetButton (nút dưới thẻ luyện dở).
import Link from "next/link";
import type { SkillStat } from "@/lib/practice/server";
import { PRACTICE_STEPS, STEP_LABEL } from "@/lib/practice/state";
import { CASEL_LIST, subskillHref, SUBSKILLS } from "@/lib/sel/casel";
import { isSkillId, SKILL_IDS, SKILLS, type SkillId } from "@/lib/skills";
import { cn } from "@/components/ui/cn";
import { MascotArt } from "@/components/mascot/MascotArt";

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

/** biểu tượng nhỏ cho 5 bước của một bài (mẫu giao diện vui 02/11) */
const STEP_EMOJI: Record<(typeof PRACTICE_STEPS)[number], string> = { H: "💡", M: "👀", T: "✏️", G: "💬", N: "🌟" };

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
    <div className="space-y-3.5">
      <section className="rounded-[1.6rem] bg-surface p-4 shadow-soft dark:border dark:border-line">
        <h2 className="font-display text-xl font-extrabold">Bông hoa của bạn 🌸</h2>
        <p className="text-sm text-muted">
          Đã nở <b className="text-ink">{done}/{skills.length}</b> bài. {done < skills.length ? "Luyện thêm để hoa nở rộ nhé!" : "Hoa đã nở rộ rồi!"}
        </p>
        <Flower petals={petals} done={done} total={skills.length} />
        <ul className="mt-1 flex flex-wrap justify-center gap-1.5">
          {petals.map((g) => (
            <li key={g.c.key} className={cn(`tone-${g.c.tone}`, "rounded-full bg-tint px-2.5 py-0.5 text-xs font-semibold text-tink")}>
              <span aria-hidden>{g.c.emoji}</span> {g.c.name} {g.ids.length ? `${g.done}/${g.ids.length}` : "· sắp có"}
            </li>
          ))}
        </ul>
      </section>

      {next && (
        <section className="tone-1 rounded-[1.6rem] bg-tint p-4">
          <h3 className="font-display text-lg font-extrabold">Gợi ý cho bạn</h3>
          <div className="mt-2 flex items-start gap-2">
            <MascotArt size={46} />
            <p className="min-w-0 rounded-2xl rounded-bl-sm bg-surface px-3 py-2 text-sm">
              <b className="block">
                {SKILLS[next].emoji} {SKILLS[next].name}
              </b>
              Nhóm {weakest.c.name} là nhóm bạn luyện ít nhất. Thử một bài nhé?
            </p>
          </div>
          <Link
            href={subskillHref(next)}
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border-2 border-brand-edge bg-brand font-bold text-brand-ink shadow-[0_3px_0_var(--brand-edge)] transition active:translate-y-0.5 active:shadow-[0_1px_0_var(--brand-edge)]"
          >
            Thử bài này →
          </Link>
        </section>
      )}

      <section className="rounded-[1.6rem] bg-surface p-4 shadow-soft dark:border dark:border-line">
        <h3 className="font-display text-lg font-extrabold">Một bài có 5 bước nhỏ</h3>
        <ol className="mt-2 space-y-2">
          {PRACTICE_STEPS.map((step) => (
            <li key={step} className="flex items-center gap-2.5 text-sm">
              <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-lg">
                {STEP_EMOJI[step]}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold leading-tight">{STEP_LABEL[step]}</span>
                <span className="block text-xs text-muted">{STEP_HINT[step]}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

// Bông hoa 5 cánh (Duy chọn 02/11 thay các vạch, vì danh sách đã ghi tiến độ từng nhóm): mỗi cánh một năng lực, màu của nhóm
// (tone), đầu cánh là emoji nhóm. Cánh nhạt là cả cánh; phần đậm dài dần theo tỉ lệ bài đã luyện ít nhất một lần.
// Nhụy là mặt cười, có cuống và lá cho giống bông hoa thật (mẫu giao diện vui).
const CORE = 26;
const TIP = 80;

function Flower({ petals, done, total }: { petals: { c: { key: string; name: string; emoji: string; tone: number }; ids: SkillId[]; done: number }[]; done: number; total: number }) {
  return (
    <svg
      viewBox="-100 -100 200 196"
      role="img"
      aria-label={`Bông hoa 5 cánh, đã nở ${done}/${total} bài: ${petals.map((g) => `${g.c.name} ${g.done}/${g.ids.length}`).join(", ")}`}
      className="mx-auto mt-1 block w-full max-w-52"
    >
      <path d="M0 27 C0 50 -4 70 -2 92" className="stroke-c2-mid" strokeWidth={4} fill="none" />
      <path d="M-2 70 C-22 60 -30 72 -26 78 C-18 80 -8 76 -2 70Z" className="fill-c2-mid" />
      {petals.map((g, i) => {
        const f = g.ids.length ? g.done / g.ids.length : 0;
        const len = CORE + (TIP - CORE) * f;
        const a = i * 72;
        return (
          <g key={g.c.key} transform={`rotate(${a})`} className={`tone-${g.c.tone}`}>
            <ellipse cy={-(CORE + TIP) / 2} rx={22} ry={(TIP - CORE) / 2 + 9} className="fill-tint stroke-tmid" strokeWidth={2} />
            {f > 0 && <ellipse cy={-(CORE + len) / 2} rx={13 + 9 * f} ry={(len - CORE) / 2 + 9} className="fill-tmid" />}
            <text transform={`translate(0 ${-TIP - 11}) rotate(${-a})`} textAnchor="middle" dominantBaseline="middle" fontSize={15} aria-hidden>
              {g.c.emoji}
            </text>
          </g>
        );
      })}
      <circle r={CORE + 1} className="fill-brand-soft stroke-brand-mark" strokeWidth={3} />
      <path d="M-9 -4 q3 -4 6 0 M3 -4 q3 -4 6 0 M-6 5 q6 6 12 0" className="stroke-ink" strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <circle cx={-14} cy={4} r={3} fill="#f4a3b4" />
      <circle cx={14} cy={4} r={3} fill="#f4a3b4" />
    </svg>
  );
}

/** Trang chọn tình huống: xem trước 5 bước, "Bài tốt cần có" (biết đích trước khi chọn), lần luyện trước. */
export function BeforeStartPanel({ skill, stat }: { skill: SkillId; stat: SkillStat }) {
  // giao diện vui (02/11): ba thẻ mềm giống cột phải của trang bài luyện; màu nhóm lấy từ tone-N của trang
  return (
    <div className="space-y-3.5">
      <section className="rounded-[1.6rem] bg-surface p-4 shadow-soft dark:border dark:border-line">
        <h2 className="font-display text-lg font-extrabold">Trước khi bắt đầu 📋</h2>
        <p className="text-sm text-muted">Chọn một tình huống, bài sẽ đi qua 5 bước.</p>
        <ol className="mt-2.5 space-y-2">
          {PRACTICE_STEPS.map((step, i) => (
            <li key={step} className="flex items-center gap-2.5 text-sm">
              <span aria-hidden className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-lg">
                {STEP_EMOJI[step]}
                <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-surface text-[10px] font-bold text-brand-strong shadow-soft">{i + 1}</span>
              </span>
              <span className="min-w-0">
                <span className="block font-semibold leading-tight">{STEP_LABEL[step]}</span>
                <span className="block text-xs text-muted">{STEP_HINT[step]}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-[1.6rem] bg-tint p-4">
        <h3 className="font-display text-lg font-extrabold">Bài tốt cần có ✨</h3>
        <ul className="mt-2 space-y-1.5 text-sm">
          {SKILLS[skill].criteria.map((c, i) => (
            <li key={c} className="flex gap-2 rounded-xl bg-surface px-2.5 py-2">
              <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded-full bg-tmid text-[11px] font-bold text-ink">
                {i + 1}
              </span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-[1.6rem] bg-surface p-4 shadow-soft dark:border dark:border-line">
        <h3 className="font-display text-lg font-extrabold">Lần luyện trước</h3>
        <div className="mt-2 flex items-start gap-2">
          <MascotArt size={40} />
          <p className="min-w-0 rounded-2xl rounded-bl-sm bg-c1 px-3 py-2 text-sm text-c1-ink">
            {stat.count > 0
              ? `⭐ Bạn đã luyện ${stat.count} lần${stat.lastAt ? `, gần nhất ngày ${when(stat.lastAt)}` : ""}. Lần này thử một tình huống khác nhé!`
              : "Bạn chưa luyện bài này. Thử lần đầu nào!"}
          </p>
        </div>
      </section>
    </div>
  );
}
