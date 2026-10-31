import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { requirePage } from "@/lib/permissions";
import { dayKey } from "@/lib/dates";
import { loadDashboard } from "@/lib/dashboard";
import { dashboardCsv, PRESET_LABEL, resolveRange, TRIAL, type Dashboard, type RangePreset } from "@/lib/dashboard-calc";
import { MIN_GROUP } from "@/lib/staff-privacy";
import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/admin/AdminUI";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { ExportButton } from "../research/ExportButton";
import { DayBars, HBars, Heatmap, MOOD_LABEL, MoodBars, Spark } from "./Charts";

export const metadata: Metadata = { title: "Tổng quan app" };

// TỔNG QUAN APP (kế hoạch Demo 3, 13.3): theo dõi hằng ngày, nhất là đợt dùng thử 03–12/11.
// Chỉ số liệu gộp; nhóm dưới 5 bạn bị ẩn; không tính lớp thử và lớp trình diễn. Mặc định chỉ admin.

type Search = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
const pct = (x: number | null) => (x == null ? "–" : `${Math.round(x * 100)}%`);
const shown = (n: number | null) => (n == null ? "ẩn" : n);
const dmy = (d: string) => `${d.slice(8)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

export default async function DashboardPage({ searchParams }: { searchParams: Search }) {
  await requirePage("/staff/tong-quan");
  const sp = await searchParams;
  const today = dayKey();
  const range = resolveRange({ khoang: one(sp.khoang), tu: one(sp.tu), den: one(sp.den) }, today);
  const lop = one(sp.lop);
  const classId = lop && z.uuid().safeParse(lop).success ? lop : null;
  const { data: d, classes } = await loadDashboard(range, classId);
  const cls = classes.find((c) => c.id === classId);
  const classLabel = cls?.name ?? "Tất cả lớp";

  const link = (preset: RangePreset) => {
    const p = new URLSearchParams({ khoang: preset });
    if (cls) p.set("lop", cls.id);
    return `/staff/tong-quan?${p}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vận hành"
        title="Tổng quan app"
        action={
          <div className="flex flex-wrap gap-2">
            <ExportButton rows={dashboardCsv(d, classLabel)} filename={`fmood-tong-quan-${range.from}-${range.to}.csv`} />
          </div>
        }
      >
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Số liệu gộp để theo dõi tình hình mỗi ngày. Không có nội dung tin nhắn hay bài làm; nhóm dưới {MIN_GROUP} bạn được ẩn; không tính
          lớp thử và lớp trình diễn. Số liệu cho báo cáo xem ở{" "}
          <Link href="/staff/research" className="font-semibold text-brand-strong hover:underline dark:text-brand">
            Kết quả nghiên cứu
          </Link>{" "}
          và{" "}
          <Link href="/staff/research/hieu-qua" className="font-semibold text-brand-strong hover:underline dark:text-brand">
            App có giúp được không
          </Link>
          .
        </p>
      </PageHeader>

      {/* Bộ lọc: khoảng thời gian và lớp */}
      <div className="space-y-3 rounded-[var(--radius-card)] border border-line bg-surface p-4">
        <nav aria-label="Khoảng thời gian" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {(["7", "30", "dot-thu"] as RangePreset[]).map((p) => (
            <Link
              key={p}
              href={link(p)}
              aria-current={range.preset === p ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
                range.preset === p ? "bg-ink text-bg" : "border border-line bg-surface text-muted hover:text-ink",
              )}
            >
              {PRESET_LABEL[p]}
            </Link>
          ))}
        </nav>
        <form method="get" className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <input type="hidden" name="khoang" value="tu-chon" />
          <label className="text-sm">
            <span className="mb-1 block font-semibold">Từ ngày</span>
            <input type="date" name="tu" defaultValue={range.from} className={cn(input, "px-3")} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold">Đến ngày</span>
            <input type="date" name="den" defaultValue={range.to} className={cn(input, "px-3")} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold">Lớp</span>
            <select name="lop" defaultValue={cls?.id ?? ""} className={input}>
              <option value="">Tất cả lớp</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={btn.primary}>
            Xem
          </button>
        </form>
        <p className="text-sm text-muted">
          Đang xem: <strong className="text-ink">{dmy(range.from)} – {dmy(range.to)}</strong> · {classLabel} · {d.students} học sinh được tính
          {range.preset === "dot-thu" && today < TRIAL.from && " · đợt thử chưa bắt đầu"}
        </p>
      </div>

      {d.tooSmall ? (
        <p className="rounded-3xl bg-peach p-8 text-center font-semibold">
          Nhóm này có dưới {MIN_GROUP} học sinh nên số liệu được ẩn, để không ai bị nhận ra.
        </p>
      ) : (
        <Areas d={d} />
      )}
    </div>
  );
}

function Areas({ d }: { d: Dashboard }) {
  const u = d.usage;
  return (
    <>
      {/* ── 1. Sử dụng ── */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Big label="Hoạt động hôm nay" value={shown(u.activeToday)} tone="bg-mint" />
        <Big label="Hoạt động 7 ngày qua" value={shown(u.active7)} tone="bg-sky" />
        <Big label="Hoạt động trong khoảng chọn" value={shown(u.activeRange)} sub={`trên ${d.students} học sinh`} tone="bg-butter" />
        <Big label="Cảnh báo trong khoảng" value={u.totals.alerts} tone="bg-peach" />
      </section>

      <Section title="1. Sử dụng" description="Học sinh có hoạt động (ghi tâm trạng, trò chuyện, luyện, việc nhỏ, thư viện, thói quen, khu vườn, cần giúp) mỗi ngày. Ngày dưới 5 bạn hiện “ẩn”.">
        <DayBars data={u.daily.map((x) => ({ day: x.day, value: x.active }))} unit="học sinh" />
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Spark label="Lượt ghi tâm trạng" values={u.daily.map((x) => x.checkins)} total={u.totals.checkins} color="var(--series-pos)" />
          <Spark label="Bài luyện hoàn thành" values={u.daily.map((x) => x.practice)} total={u.totals.practiceDone} color="var(--series-neg)" />
          <Spark label="Việc nhỏ làm xong" values={u.daily.map((x) => x.actions)} total={u.totals.actionsDone} color="var(--series-neu)" />
          <Spark label="Cần giúp, lời nhờ" values={u.daily.map((x) => x.help)} total={u.totals.help} color="var(--brand)" />
          <Spark label="Cảnh báo" values={u.daily.map((x) => x.alerts)} total={u.totals.alerts} color="var(--danger)" />
        </div>
      </Section>

      {/* ── 2. Tâm trạng ── */}
      <Section title="2. Tâm trạng" description="Tỉ lệ mỗi lần ghi tâm trạng theo nhóm cảm xúc chính, theo ngày. “Chưa rõ” tính riêng.">
        <MoodBars data={d.mood.daily} />
        {d.mood.total ? (
          <div className="mt-4 grid grid-cols-2 gap-x-6 sm:grid-cols-4">
            {(["positive", "neutral", "negative", "unsure"] as const).map((k) => (
              <Metric key={k} label={MOOD_LABEL[k]} value={`${d.mood.total?.[k] ?? 0} (${pct(d.mood.total ? (d.mood.total[k] / Math.max(1, d.mood.total.total)) : null)})`} />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Tổng cả khoảng: chưa đủ {MIN_GROUP} bạn ghi tâm trạng.</p>
        )}
      </Section>

      {/* ── 3. Trò chuyện ── */}
      <Section title="3. Trò chuyện" description="Chỉ đếm, không đọc tin nhắn. Chủ đề lấy từ chủ đề trợ lý đoán mà học sinh bấm “Đúng rồi” và chuyện bận lòng đã lưu.">
        <div className="grid grid-cols-2 gap-x-6 sm:grid-cols-4">
          <Metric label="Cuộc trò chuyện mới" value={d.chat.conversations} />
          <Metric label="Tin nhắn của học sinh" value={d.chat.messages} />
          <Metric label="Trung bình tin mỗi cuộc" value={d.chat.avgPerConversation ?? "–"} />
          <Metric label="👍 / 👎" value={`${d.chat.feedback.ups} / ${d.chat.feedback.downs} (${pct(d.chat.feedback.ups + d.chat.feedback.downs ? d.chat.feedback.ups / (d.chat.feedback.ups + d.chat.feedback.downs) : null)} 👍)`} />
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 font-semibold">Bắt đầu từ đâu</h3>
            <HBars items={d.chat.sources.map((s) => ({ label: s.label, value: s.count }))} color="var(--series-neg)" />
          </div>
          {d.chat.selSteps && (
            <div>
              <h3 className="mb-3 font-semibold">Bước SEL đã đạt (số cuộc trò chuyện)</h3>
              <HBars items={d.chat.selSteps.map((s) => ({ label: s.label, value: s.count, note: s.note }))} color="var(--series-pos)" />
            </div>
          )}
          {d.chat.selCasel && (
            <div>
              <h3 className="mb-1 font-semibold">Năng lực SEL đã luyện (số cuộc trò chuyện)</h3>
              <p className="mb-3 text-xs text-muted">Theo nhãn CASEL của các bước đã đi. Một cuộc trò chuyện có thể chạm nhiều năng lực.</p>
              <HBars items={d.chat.selCasel.map((s) => ({ label: s.label, value: s.count }))} color="var(--series-pos)" />
            </div>
          )}
          <div>
            <h3 className="mb-3 font-semibold">Chủ đề phổ biến</h3>
            <HBars
              items={[
                ...d.chat.topics.map((t) => ({ label: t.label, value: t.count, note: `· ${t.students} bạn` })),
                ...(d.chat.hiddenTopics ? [{ label: `Chủ đề khác (mỗi chủ đề dưới ${MIN_GROUP} bạn)`, value: d.chat.hiddenTopics }] : []),
              ]}
              color="var(--series-neu)"
            />
          </div>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-1 font-semibold">Nhân vật và tùy chọn đang dùng</h3>
            {d.chat.styles ? (
              <>
                <p className="mb-3 text-xs text-muted">
                  Số bạn đang dùng mỗi lựa chọn (chưa tự chọn thì tính theo mức mặc định). Đã tự chọn: {d.chat.styles.chosen ?? `dưới ${MIN_GROUP} bạn`} · lượt đổi
                  trong khoảng: {d.chat.styles.changes}. Mỗi mục dưới {MIN_GROUP} bạn bị ẩn.
                </p>
                <div className="space-y-4">
                  {d.chat.styles.groups.map((g) => (
                    <div key={g.group}>
                      <p className="mb-1.5 text-xs font-semibold text-muted">{g.label}</p>
                      <HBars
                        items={g.items
                          .filter((it) => it.students !== null)
                          .map((it) => ({ label: `${it.label}${it.isDefault ? " (mặc định)" : ""}`, value: it.students ?? 0 }))}
                        color="var(--series-pos)"
                        empty={`Mỗi lựa chọn dưới ${MIN_GROUP} bạn.`}
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">Chưa có dữ liệu (chưa chạy migration 0020).</p>
            )}
          </div>
          <div>
            <h3 className="mb-1 font-semibold">Thẻ gợi ý: đã hiện và đã bấm</h3>
            <p className="mb-3 text-xs text-muted">Đếm lượt, không ghi nội dung thẻ. Thẻ không hiện ở lượt đáng lo hay khẩn cấp.</p>
            <Metric label="🎯 Mục tiêu: hiện / thêm vào thói quen / để sau" value={`${d.chat.cards.goal.shown} / ${d.chat.cards.goal.add} / ${d.chat.cards.goal.later}`} />
            <Metric label="🧩 Kỹ năng: hiện / mở bài luyện" value={`${d.chat.cards.skill.shown} / ${d.chat.cards.skill.opened}`} />
            {d.chat.cards.skill.bySkill.map((x) => (
              <Metric key={x.skill} label={`   · ${x.skill}`} value={`${x.shown} / ${x.opened}`} />
            ))}
            <Metric label="👋 Dừng: hiện / dừng ở đây / nói tiếp" value={`${d.chat.cards.end.shown} / ${d.chat.cards.end.stop} / ${d.chat.cards.end.cont}`} />
          </div>
        </div>
      </Section>

      {/* ── 4. Bài tập và luyện kỹ năng ── */}
      <Section title="4. Bài tập và luyện kỹ năng" description="Lượt luyện theo kỹ năng, tỉ lệ nhờ góp ý, sửa lần 2, hoàn thành; việc nhỏ và bài thư viện được quan tâm nhất.">
        {!d.practice.ready ? (
          <p className="text-sm text-muted">Bài luyện: chưa có dữ liệu (chưa chạy migration 0017).</p>
        ) : (
          <>
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="text-left text-muted">
                    <th className="py-1 font-medium">Kỹ năng</th>
                    <th className="py-1 text-right font-medium">Lượt luyện</th>
                    <th className="py-1 text-right font-medium">Số bạn</th>
                    <th className="py-1 text-right font-medium">Hoàn thành</th>
                  </tr>
                </thead>
                <tbody>
                  {d.practice.bySkill.map((s) => (
                    <tr key={s.skill} className="border-t border-line">
                      <td className="py-1.5">
                        <strong>{s.skill}</strong> {s.label}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">{s.sessions}</td>
                      <td className="py-1.5 text-right tabular-nums">{shown(s.students)}</td>
                      <td className="py-1.5 text-right tabular-nums">{s.completed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-x-6 sm:grid-cols-3">
              <Metric label="Nhờ góp ý / lượt luyện" value={pct(d.practice.rates.feedback)} />
              <Metric label="Sửa lần 2 / lượt luyện" value={pct(d.practice.rates.revised)} />
              <Metric label="Hoàn thành / lượt luyện" value={pct(d.practice.rates.completed)} />
            </div>
          </>
        )}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 font-semibold">10 việc nhỏ được quan tâm nhất</h3>
            <HBars
              items={d.practice.topActions.map((a) => ({ label: a.label, value: a.opens + a.done, note: `· mở ${a.opens}, xong ${a.done}` }))}
              color="var(--series-neu)"
              empty="Chưa có lượt mở hay làm xong việc nhỏ nào."
            />
          </div>
          <div>
            <h3 className="mb-3 font-semibold">10 bài thư viện mở nhiều nhất</h3>
            <HBars items={d.practice.topLessons.map((l) => ({ label: l.label, value: l.opens }))} color="var(--series-pos)" empty="Chưa có lượt mở bài nào (cần migration 0019)." />
          </div>
        </div>
      </Section>

      {/* ── 5. Kết quả ── */}
      <Section title="5. Kết quả sau thời gian đồng hành" description="Chỉ hiện khi có từ 5 bạn trở lên.">
        <div className="grid gap-6 lg:grid-cols-3">
          <div>
            <h3 className="mb-3 font-semibold">Chuyện bận lòng được hỏi thăm lại</h3>
            {d.outcomes.followups ? (
              <HBars
                items={[
                  { label: "Đỡ hơn", value: d.outcomes.followups.better },
                  { label: "Đã ổn, xong", value: d.outcomes.followups.done },
                  { label: "Vẫn vậy", value: d.outcomes.followups.same },
                  { label: "Nặng hơn", value: d.outcomes.followups.worse },
                ]}
              />
            ) : (
              <p className="text-sm text-muted">Chưa đủ {MIN_GROUP} bạn trả lời hỏi thăm trong khoảng này.</p>
            )}
          </div>
          <div>
            <h3 className="mb-3 font-semibold">Tâm trạng tuần đầu → tuần gần nhất</h3>
            {d.outcomes.firstVsLatest ? (
              <>
                <p className="font-display text-3xl font-extrabold tabular-nums tracking-tight">
                  {d.outcomes.firstVsLatest.first} → {d.outcomes.firstVsLatest.latest}
                </p>
                <p className="mt-1 text-xs text-muted">Thang −1 (nặng lòng) đến 1 (tích cực), {d.outcomes.firstVsLatest.students} bạn đã dùng từ 2 tuần.</p>
                <Metric label="Khá hơn / giữ / kém hơn" value={`${d.outcomes.firstVsLatest.improved} / ${d.outcomes.firstVsLatest.same} / ${d.outcomes.firstVsLatest.worse}`} />
              </>
            ) : (
              <p className="text-sm text-muted">Chưa đủ {MIN_GROUP} bạn ghi tâm trạng cách nhau từ 2 tuần.</p>
            )}
          </div>
          <div>
            <h3 className="mb-3 font-semibold">Bài đo kỹ năng lần 1 → lần 2</h3>
            {d.outcomes.tests ? (
              <>
                <p className="font-display text-3xl font-extrabold tabular-nums tracking-tight">
                  {d.outcomes.tests.before} → {d.outcomes.tests.after}
                </p>
                <p className="mt-1 text-xs text-muted">Tổng điểm 0–24 (người chấm 1, đã khóa điểm), {d.outcomes.tests.students} bạn làm cả hai lần.</p>
              </>
            ) : (
              <p className="text-sm text-muted">Chưa có dữ liệu (chỉ hiện sau khi khóa điểm, từ {MIN_GROUP} bạn làm đủ hai lần).</p>
            )}
          </div>
        </div>
      </Section>

      {/* ── 6. Mức độ tương tác ── */}
      <Section title="6. Mức độ tương tác theo hoạt động" description="Số bạn dùng, số lượt, tỉ lệ quay lại (dùng từ 2 ngày khác nhau trở lên) trong khoảng chọn.">
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-1 font-medium">Tính năng</th>
                <th className="py-1 text-right font-medium">Số bạn</th>
                <th className="py-1 text-right font-medium">Số lượt</th>
                <th className="py-1 text-right font-medium">Quay lại</th>
              </tr>
            </thead>
            <tbody>
              {d.engagement.features.map((f) => (
                <tr key={f.key} className="border-t border-line">
                  <td className="py-1.5">{f.label}</td>
                  <td className="py-1.5 text-right tabular-nums">{shown(f.students)}</td>
                  <td className="py-1.5 text-right tabular-nums">{f.uses}</td>
                  <td className="py-1.5 text-right tabular-nums">{pct(f.returnRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="mb-3 mt-6 font-semibold">Học sinh dùng app vào lúc nào (thứ × giờ)</h3>
        {d.engagement.heatmapMax === 0 ? <p className="text-sm text-muted">Chưa có dữ liệu.</p> : <Heatmap grid={d.engagement.heatmap} max={d.engagement.heatmapMax} />}
      </Section>

      {/* ── 7. Giữ chân ── */}
      <Section title="7. Giữ chân" description="Trong các bạn dùng lần đầu ở khoảng chọn: bao nhiêu bạn còn dùng sau 7 và 14 ngày.">
        <div className="grid grid-cols-2 gap-3">
          <Big
            label="Còn dùng sau 7 ngày"
            value={d.retention.d7 ? pct(d.retention.d7.retained / d.retention.d7.cohort) : "–"}
            sub={d.retention.d7 ? `${d.retention.d7.retained}/${d.retention.d7.cohort} bạn` : "chưa đủ dữ liệu"}
            tone="bg-lilac"
          />
          <Big
            label="Còn dùng sau 14 ngày"
            value={d.retention.d14 ? pct(d.retention.d14.retained / d.retention.d14.cohort) : "–"}
            sub={d.retention.d14 ? `${d.retention.d14.retained}/${d.retention.d14.cohort} bạn` : "chưa đủ dữ liệu"}
            tone="bg-mint"
          />
        </div>
      </Section>
    </>
  );
}

function Big({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone: string }) {
  return (
    <div className={`rounded-[var(--radius-card)] p-5 ${tone}`}>
      <p className="font-display text-4xl font-extrabold tabular-nums tracking-tight">{value}</p>
      <p className="mt-1 text-sm font-medium text-muted">{label}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <p className="flex items-baseline justify-between gap-4 border-b border-line py-2 text-sm">
      <span className="text-muted">{label}</span>
      <strong className="tabular-nums">{value}</strong>
    </p>
  );
}
