import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { researchMetrics, supportLoopMetrics } from "@/lib/admin-data";
import { GROUP_COLOR, GROUP_LABEL, type EmotionGroup } from "@/lib/emotions";
import { FEEDBACK_REASONS, isReason } from "@/lib/feedback";
import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/admin/AdminUI";
import { ExportButton } from "./ExportButton";
import { loopCsvRows, SupportLoopSection } from "./SupportLoopSection";

export const metadata: Metadata = { title: "Kết quả nghiên cứu" };

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");

export default async function ResearchPage({ searchParams }: PageProps<"/staff/research">) {
  await requireStaff(["admin", "counselor"]);
  const includeTest = (await searchParams)["lop-thu"] === "1";
  const [m, loop] = await Promise.all([researchMetrics(), supportLoopMetrics(includeTest)]);
  const maxWeekly = Math.max(1, ...m.weekly.map((w) => Math.max(w.active, 0)));
  const groupTotal = m.groups.positive + m.groups.neutral + m.groups.negative;

  const csvRows = [
    ["Chỉ số", "Giá trị"],
    ["Tổng học sinh", m.students],
    ["Hoạt động 7 ngày", m.activeStudents.week],
    ["Hoạt động 30 ngày", m.activeStudents.month],
    ["Tỉ lệ quay lại tuần sau", m.retention ? pct(m.retention.returned, m.retention.cohort) : "chưa đủ dữ liệu"],
    ["Check-in / học sinh hoạt động (30 ngày)", m.checkinsPerActive],
    ["Số thói quen", m.habits.total],
    ["Thói quen giữ được chuỗi ≥ 3 ngày", m.habits.withStreak3],
    ["Lượt suy ngẫm", m.reflections],
    ["Cảnh báo (tổng / khẩn cấp / đã xong)", `${m.alerts.total} / ${m.alerts.urgent} / ${m.alerts.resolved}`],
    ["Thời gian xử lý cảnh báo (trung vị, giờ)", m.alerts.medianHandleHours ?? "–"],
    ["Phiếu khảo sát / lượt trả lời", `${m.surveys.count} / ${m.surveys.responses}`],
    ["Phản hồi Mây 👍 / 👎", `${m.feedback.ups} / ${m.feedback.downs}`],
    ...m.weekly.map((w) => [`Tuần từ ${w.week}: hoạt động / check-in / tin nhắn`, `${w.active < 0 ? "<3" : w.active} / ${w.checkins} / ${w.chats}`]),
    ...loopCsvRows(loop.stats, includeTest),
  ];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Nghiên cứu" title="Kết quả nghiên cứu" action={<ExportButton rows={csvRows} />}>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Số liệu tổng hợp ẩn danh để trả lời các câu hỏi đánh giá trong đề cương. Nhóm nào ít hơn 3 học sinh sẽ được ẩn
          để không ai bị nhận ra.
        </p>
      </PageHeader>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Big label="Học sinh đã đăng ký" value={m.students} tone="bg-sky" />
        <Big label="Hoạt động 7 ngày qua" value={m.activeStudents.week} sub={pct(m.activeStudents.week, m.students)} tone="bg-mint" />
        <Big label="Hoạt động 30 ngày qua" value={m.activeStudents.month} sub={pct(m.activeStudents.month, m.students)} tone="bg-butter" />
        <Big
          label="Quay lại tuần sau"
          value={m.retention ? pct(m.retention.returned, m.retention.cohort) : "–"}
          sub={m.retention ? `${m.retention.returned}/${m.retention.cohort} em` : "chưa đủ dữ liệu"}
          tone="bg-lilac"
        />
      </section>

      <Section title="Học sinh hoạt động mỗi tuần" description="Có check-in hoặc trò chuyện với Mây trong tuần. 8 tuần gần nhất.">
        <div className="flex h-40 items-end gap-2 border-b border-line">
          {m.weekly.map((w) => (
            <div key={w.week} className="flex h-full flex-1 flex-col justify-end" title={`Tuần từ ${w.week}`}>
              {w.active > 0 && <span className="mb-1 text-center text-xs font-semibold">{w.active}</span>}
              <div className="rounded-t bg-[var(--series-pos)]" style={{ height: `${(Math.max(w.active, 0) / maxWeekly) * 100}%`, minHeight: w.active > 0 ? 3 : 0 }} />
              {w.active < 0 && <span className="text-center text-[10px] text-muted">&lt;3</span>}
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-2 text-center text-[11px] text-muted">
          {m.weekly.map((w) => (
            <span key={w.week} className="flex-1">
              {w.week.slice(8)}/{w.week.slice(5, 7)}
            </span>
          ))}
        </div>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Học sinh có biết làm gì tiếp?" description="Mức độ dùng các tính năng giúp học sinh có bước tiếp theo.">
          <Metric label="Check-in / học sinh hoạt động (30 ngày)" value={m.checkinsPerActive} />
          <Metric label="Lượt viết suy ngẫm" value={m.reflections} />
          <Metric label="Thói quen được tạo" value={m.habits.total} />
          <Metric label="Thói quen giữ được chuỗi ≥ 3 ngày" value={`${m.habits.withStreak3} (${pct(m.habits.withStreak3, m.habits.total)})`} />
          <Metric label="Số lần đánh dấu TB mỗi thói quen" value={m.habits.avgLogsPerHabit} />
        </Section>

        <Section title="Kết nối với người lớn" description="F-Mood có nhận ra và đưa học sinh tới người thật kịp thời không?">
          <Metric label="Cảnh báo đã tạo" value={m.alerts.total} />
          <Metric label="Trong đó khẩn cấp" value={m.alerts.urgent} />
          <Metric label="Đã xử lý xong" value={`${m.alerts.resolved} (${pct(m.alerts.resolved, m.alerts.total)})`} />
          <Metric label="Thời gian từ lúc báo tới lúc thầy cô xử lý (trung vị)" value={m.alerts.medianHandleHours != null ? `${m.alerts.medianHandleHours} giờ` : "–"} />
        </Section>
      </div>

      <SupportLoopSection ready={loop.ready} stats={loop.stats} includeTest={includeTest} testStudents={loop.testStudents} />

      <Section title="Cảm xúc chung 30 ngày" description="Tỉ lệ ba nhóm cảm xúc trong mọi lần check-in.">
        {groupTotal === 0 ? (
          <p className="text-sm text-muted">Chưa đủ dữ liệu (cần ít nhất 3 học sinh hoạt động).</p>
        ) : (
          <>
            <div className="flex h-5 gap-0.5 overflow-hidden rounded-full">
              {(["positive", "neutral", "negative"] as EmotionGroup[])
                .filter((g) => m.groups[g] > 0)
                .map((g) => (
                  <span key={g} style={{ flexGrow: m.groups[g], background: GROUP_COLOR[g] }} />
                ))}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              {(["positive", "neutral", "negative"] as EmotionGroup[]).map((g) => (
                <li key={g} className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm" style={{ background: GROUP_COLOR[g] }} />
                  {GROUP_LABEL[g]} <strong>{pct(m.groups[g], groupTotal)}</strong>
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>

      <Section title="Học sinh thấy Mây có hữu ích không?" description="Phản hồi 👍/👎 dưới câu trả lời của Mây (tổng hợp ẩn danh).">
        <Metric label="👍 Hài lòng" value={`${m.feedback.ups} (${pct(m.feedback.ups, m.feedback.ups + m.feedback.downs)})`} />
        <Metric label="👎 Chưa hài lòng" value={m.feedback.downs} />
        {m.feedback.reasons.map((r) => (
          <Metric key={r.reason} label={`  · ${isReason(r.reason) ? FEEDBACK_REASONS[r.reason].label : r.reason}`} value={r.count} />
        ))}
      </Section>

      <Section title="Phiếu khảo sát" description="Xem kết quả từng phiếu trong mục Phiếu khảo sát.">
        <Metric label="Số phiếu" value={m.surveys.count} />
        <Metric label="Lượt trả lời" value={m.surveys.responses} />
      </Section>
    </div>
  );
}

function Big({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone: string }) {
  return (
    <div className={`rounded-[var(--radius-card)] p-5 ${tone}`}>
      <p className="font-display text-4xl font-extrabold tracking-tight">{value}</p>
      <p className="mt-1 text-sm font-medium text-muted">{label}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <p className="flex items-baseline justify-between gap-4 border-b border-line py-2 text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <strong className="tabular-nums">{value}</strong>
    </p>
  );
}
