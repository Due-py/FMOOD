import Link from "next/link";
import { Section } from "@/components/admin/AdminUI";
import type { LoopGroupStats, SupportLoopStats } from "@/lib/support-stats";
import type { Who } from "@/lib/support-picks";

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");

const WHO_LABEL: Record<Who, string> = { parent: "Bố mẹ", teacher: "Thầy cô", friend: "Bạn thân", other: "Người khác" };
const FEELING_LABEL = { better: "Đỡ hơn", same: "Vẫn vậy", worse: "Nặng hơn", done: "Chuyện này xong rồi" } as const;
const HIDDEN = "ẩn (dưới 3 học sinh)";

const change = (s: LoopGroupStats) =>
  `${s.down} / ${s.same} / ${s.up} (${pct(s.down, s.followedUp)} / ${pct(s.same, s.followedUp)} / ${pct(s.up, s.followedUp)})`;
const avgs = (s: LoopGroupStats) => (s.avgStart == null ? "–" : `${s.avgStart} → ${s.avgLast}`);

/** Các dòng thêm vào file CSV của trang Kết quả nghiên cứu. */
export function loopCsvRows(stats: SupportLoopStats, includeTest: boolean): (string | number)[][] {
  const o = stats.overall;
  return [
    ["Vòng hỗ trợ", includeTest ? "CÓ tính lớp thử (chỉ để kiểm tra)" : "không tính lớp thử"],
    ["Vòng hỗ trợ: chuyện bận lòng được lưu (học sinh)", o ? `${o.worries} (${o.students})` : HIDDEN],
    ["Vòng hỗ trợ: được hỏi lại ít nhất 1 lần", o ? `${o.followedUp} (${pct(o.followedUp, o.worries)})` : HIDDEN],
    ["Vòng hỗ trợ: mức lo giảm / giữ / tăng", o ? change(o) : HIDDEN],
    ["Vòng hỗ trợ: mức lo trung bình lúc kể → lần hỏi lại cuối", o ? avgs(o) : HIDDEN],
    ...(stats.feelings
      ? (Object.keys(FEELING_LABEL) as (keyof typeof FEELING_LABEL)[]).map((f) => [`Vòng hỗ trợ: lần trả lời cuối "${FEELING_LABEL[f]}"`, stats.feelings![f]])
      : []),
    ...stats.byTopic.map((t) => [
      `Vòng hỗ trợ · ${t.label}: chuyện / được hỏi lại / giảm-giữ-tăng / TB đầu → cuối`,
      t.stats ? `${t.stats.worries} / ${t.stats.followedUp} / ${t.stats.down}-${t.stats.same}-${t.stats.up} / ${avgs(t.stats)}` : HIDDEN,
    ]),
    ...stats.told.map((t) => [`Vòng hỗ trợ: đã kể với ${WHO_LABEL[t.who]} (lần / học sinh)`, t.times == null ? HIDDEN : `${t.times} / ${t.students}`]),
    ["Vòng hỗ trợ: việc nhỏ đã làm (lần / học sinh)", stats.tinyActions ? `${stats.tinyActions.times} / ${stats.tinyActions.students}` : HIDDEN],
  ];
}

/** Mục "Vòng hỗ trợ": chuyện bận lòng có nhẹ đi sau khi được hỏi lại không, học sinh có tìm tới người thật không. */
export function SupportLoopSection({
  ready,
  stats,
  includeTest,
  testStudents,
}: {
  ready: boolean;
  stats: SupportLoopStats;
  includeTest: boolean;
  testStudents: number;
}) {
  const o = stats.overall;
  return (
    <Section
      title="Vòng hỗ trợ"
      description="Chuyện bận lòng có nhẹ đi sau khi Mây hỏi lại không? Mức lo tính bằng con số 1–5 (lần hỏi lại cuối so với lúc kể). Chuyện học sinh đã xóa không được tính."
    >
      <p className="mb-4 rounded-2xl bg-surface-2 px-4 py-2.5 text-sm">
        {includeTest ? (
          <>
            <strong>Đang tính cả lớp thử</strong> ({testStudents} học sinh), chỉ để kiểm tra, không dùng làm số liệu nghiên cứu.{" "}
            <Link href="/staff/research" className="font-semibold underline underline-offset-4">
              Bỏ lớp thử
            </Link>
          </>
        ) : (
          <>
            Không tính {testStudents} học sinh lớp thử.{" "}
            <Link href="/staff/research?lop-thu=1" className="font-semibold underline underline-offset-4">
              Xem cả lớp thử
            </Link>
          </>
        )}
      </p>

      {!ready ? (
        <p className="text-sm text-muted">Chưa có dữ liệu: cần chạy file 0010_vong_ho_tro.sql.</p>
      ) : !o ? (
        <p className="text-sm text-muted">Chưa đủ dữ liệu (cần ít nhất 3 học sinh đã lưu chuyện bận lòng).</p>
      ) : (
        <div className="space-y-6">
          <div>
            <Row label="Chuyện bận lòng được lưu" value={`${o.worries} (${o.students} học sinh)`} />
            <Row label="Được hỏi lại ít nhất 1 lần" value={`${o.followedUp} (${pct(o.followedUp, o.worries)})`} />
            <Row label="Mức lo trung bình: lúc kể → lần hỏi lại cuối" value={avgs(o)} />
          </div>

          {o.followedUp > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold">Mức lo sau khi được hỏi lại ({o.followedUp} chuyện)</p>
              <div className="flex h-5 gap-0.5 overflow-hidden rounded-full">
                {[
                  { n: o.down, color: "var(--series-pos)" },
                  { n: o.same, color: "var(--series-neu)" },
                  { n: o.up, color: "var(--series-neg)" },
                ]
                  .filter((x) => x.n > 0)
                  .map((x, i) => (
                    <span key={i} style={{ flexGrow: x.n, background: x.color }} />
                  ))}
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <Legend color="var(--series-pos)" label="Giảm" value={`${o.down} (${pct(o.down, o.followedUp)})`} />
                <Legend color="var(--series-neu)" label="Giữ nguyên" value={`${o.same} (${pct(o.same, o.followedUp)})`} />
                <Legend color="var(--series-neg)" label="Tăng" value={`${o.up} (${pct(o.up, o.followedUp)})`} />
              </ul>
            </div>
          )}

          {stats.feelings && (
            <div>
              <p className="mb-1 text-sm font-semibold">Học sinh tự nói ở lần trả lời cuối</p>
              <p className="mb-1 text-xs text-muted">Báo cáo riêng, không thay cho con số mức lo.</p>
              {(Object.keys(FEELING_LABEL) as (keyof typeof FEELING_LABEL)[]).map((f) => (
                <Row key={f} label={FEELING_LABEL[f]} value={stats.feelings![f]} />
              ))}
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-semibold">Theo chủ đề</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-muted">
                    <th className="py-2 pr-3 font-medium">Chủ đề</th>
                    <th className="py-2 pr-3 text-right font-medium">Học sinh</th>
                    <th className="py-2 pr-3 text-right font-medium">Chuyện</th>
                    <th className="py-2 pr-3 text-right font-medium">Được hỏi lại</th>
                    <th className="py-2 pr-3 text-right font-medium">Giảm / giữ / tăng</th>
                    <th className="py-2 text-right font-medium">TB đầu → cuối</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byTopic.map((t) => (
                    <tr key={t.topic} className="border-b border-line last:border-0">
                      <td className="py-2 pr-3">{t.label}</td>
                      {t.stats ? (
                        <>
                          <td className="py-2 pr-3 text-right tabular-nums">{t.stats.students}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{t.stats.worries}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{t.stats.followedUp}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">
                            {t.stats.down} / {t.stats.same} / {t.stats.up}
                          </td>
                          <td className="py-2 text-right tabular-nums">{avgs(t.stats)}</td>
                        </>
                      ) : (
                        <td colSpan={5} className="py-2 pl-3 text-muted">
                          {HIDDEN}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {ready && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-sm font-semibold">Học sinh bấm &quot;Mình đã kể rồi&quot;</p>
            <p className="mb-1 text-xs text-muted">Chỉ ghi kể với ai, không ghi kể gì.</p>
            {stats.told.map((t) => (
              <Row key={t.who} label={WHO_LABEL[t.who]} value={t.times == null ? HIDDEN : `${t.times} lần (${t.students} học sinh)`} />
            ))}
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold">Việc nhỏ đã làm</p>
            <Row
              label="Lượt làm xong"
              value={stats.tinyActions ? `${stats.tinyActions.times} lần (${stats.tinyActions.students} học sinh)` : HIDDEN}
            />
          </div>
        </div>
      )}
    </Section>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <p className="flex items-baseline justify-between gap-4 border-b border-line py-2 text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <strong className="tabular-nums">{value}</strong>
    </p>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className="size-2.5 rounded-sm" style={{ background: color }} />
      {label} <strong>{value}</strong>
    </li>
  );
}
