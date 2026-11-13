"use client";

import { useEffect, useMemo, useState } from "react";
import { recordExport } from "@/app/actions/activity";
import { asReference, CURRENT_STAGE, GROUPS, METRIC_GROUP, STAGES, surveyMetric, vn, type Metric, type Status } from "@/lib/effect/metrics";
import { AFTER_ITEMS, pairSurveys, parseSurveyCsv, SURVEY_CLASSES, type Group, type ParsedSurvey } from "@/lib/effect/survey";
import { MIN_GROUP } from "@/lib/staff-privacy";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

/** Nhóm mặc định của một lớp trong phiếu: lớp có trong F-Mood hoặc 7A1, 8A1 = dùng F-Mood; 7A3, 8A4 = lớp so sánh; còn lại chưa xếp. */
function defaultGroup(c: string, appClasses: string[]): "app" | "control" | "skip" {
  if (appClasses.includes(c) || (SURVEY_CLASSES.app as readonly string[]).includes(c)) return "app";
  if ((SURVEY_CLASSES.control as readonly string[]).includes(c)) return "control";
  return "skip";
}

// TRANG KẾT QUẢ: các tiêu chí xếp theo tên đề tài (A nhận diện cảm xúc, B rèn kỹ năng, C kết nối thầy cô, D SAFE) và mục tham khảo.
// Mỗi tiêu chí Đạt / Chưa đạt / Chưa đủ dữ liệu (hoặc Tham khảo), có cách tính và nút in.
// Số liệu từ app do máy chủ tính từ dữ liệu thật; số liệu từ phiếu khảo sát (C3 và hai chỉ số tham khảo WHO-5, PSS-4)
// tính ngay trên máy này từ file khảo sát (không gửi đi đâu).

const STATUS: Record<Status, { label: string; mark: string; cls: string }> = {
  dat: { label: "Đạt", mark: "✓", cls: "bg-[var(--series-pos)] text-white" },
  "chua-dat": { label: "Chưa đạt", mark: "✗", cls: "bg-peach text-ink" },
  "chua-du": { label: "Chưa đủ dữ liệu", mark: "…", cls: "bg-surface-2 text-muted" },
  "tham-khao": { label: "Tham khảo", mark: "i", cls: "bg-sky text-ink" },
};

const STORE_KEY = "fmood-hieu-qua-khao-sat";
type Stored = { pre: string; post: string; groups: Record<string, Group | "skip"> };

function when(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "numeric", month: "numeric", year: "numeric" }).format(
    new Date(iso),
  );
}

export function EffectReport({
  metrics,
  excludedTestStudents,
  runs,
  generatedAt,
  appClasses,
  demoSurvey = null,
}: {
  metrics: Metric[];
  excludedTestStudents: number;
  runs: { risk: string | null; reply: string | null };
  generatedAt: string;
  appClasses: string[];
  /** chế độ trình diễn: phiếu khảo sát MẪU (không đọc / ghi file khảo sát thật trên máy này) */
  demoSurvey?: Stored | null;
}) {
  const [saved, setStored] = useState<Stored>({ pre: "", post: "", groups: {} });
  const stored = demoSurvey ?? saved;

  // file khảo sát đã chọn lần trước (chỉ trên máy này)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setStored(JSON.parse(raw) as Stored);
    } catch {}
  }, []);
  function save(next: Stored) {
    if (demoSurvey) return;
    setStored(next);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {}
  }

  const survey = useMemo(() => {
    if (!stored.pre || !stored.post) return null;
    const pre = parseSurveyCsv(stored.pre);
    const post = parseSurveyCsv(stored.post);
    if (pre.error || post.error) return { pre, post, error: pre.error ?? post.error, classes: [] as string[], paired: null };
    const classes = [...new Set([...pre.rows, ...post.rows].map((r) => r.className))].sort();
    const groupOf = (c: string): Group | null => {
      // lớp chưa xếp nhóm thì không tính (giống tab Lớp trong Google Sheets)
      const g = stored.groups[c] ?? defaultGroup(c, appClasses);
      return g === "skip" ? null : g;
    };
    return { pre, post, error: undefined, classes, paired: pairSurveys(pre.rows, post.rows, groupOf) };
  }, [stored, appClasses]);

  const pairs = survey?.paired?.pairs ?? null;
  const surveyMetrics = [asReference(surveyMetric("who5", pairs)), asReference(surveyMetric("pss4", pairs)), surveyMetric("helpTeacher", pairs)];
  const all = [...metrics, ...surveyMetrics].sort((a, b) => {
    const ga = METRIC_GROUP[a.key];
    const gb = METRIC_GROUP[b.key];
    return (ga?.code ?? "Z").localeCompare(gb?.code ?? "Z");
  });
  const graded = all.filter((m) => m.status !== "tham-khao");
  const count = (s: Status) => graded.filter((m) => m.status === s).length;

  const csvRows = [
    ["Mã", "Câu hỏi", "Kết quả", "Giai đoạn", "Mục tiêu giai đoạn này", "Đích cuối", "Trạng thái", "Tính trên", "Ghi chú", "Cách tính"],
    ...all.map((m) => [
      METRIC_GROUP[m.key]?.code ?? "",
      m.title,
      m.value,
      STAGES[CURRENT_STAGE].name,
      m.target,
      m.finalTarget ?? m.target,
      STATUS[m.status].label,
      m.basis,
      m.extra ?? "",
      m.how,
    ]),
  ];

  const groups = GROUPS.map((g) => ({ ...g, items: all.filter((m) => METRIC_GROUP[m.key]?.group === g.id) })).filter((g) => g.items.length);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          {demoSurvey && (
            <p className="mb-3 inline-block rounded-full border-2 border-ink px-4 py-1 font-display text-lg font-extrabold tracking-wide">
              DỮ LIỆU MẪU · chỉ để trình diễn cách tính
            </p>
          )}
          <p className="text-sm font-semibold text-muted">
            F-Mood · Báo cáo hiệu quả · <span className="text-ink">{STAGES[CURRENT_STAGE].name}</span>
          </p>
          <h1 className="mt-1 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">App có giúp được các bạn không?</h1>
          <p className="mt-3 text-sm text-muted">
            Lập lúc {when(generatedAt)}. Không tính {excludedTestStudents} tài khoản học sinh ở lớp thử. Nhóm dưới {MIN_GROUP} bạn không kết luận, để
            không ai bị nhận ra (riêng chỉ số tham khảo R1 ở giai đoạn 1 kết luận từ 4 bạn, vì đợt thử đầu chỉ có hai lớp nhỏ). Đích cuối được đặt trước khi có số liệu; mục tiêu {STAGES[CURRENT_STAGE].name.toLowerCase()} là ngưỡng tối thiểu cho
            đợt thử đầu, đặt ngày {STAGES[CURRENT_STAGE].date}, sau khi có kết quả đợt thử đó.
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button type="button" onClick={() => window.print()} className={btn.primary}>
            🖨 In báo cáo
          </button>
          <button type="button" onClick={() => downloadCsv(csvRows)} className={btn.secondary}>
            ⬇ Tải CSV
          </button>
        </div>
      </header>

      <section aria-label="Tóm tắt" className="grid grid-cols-3 gap-3">
        {(["dat", "chua-dat", "chua-du"] as Status[]).map((s) => (
          <div key={s} className={cn("rounded-[var(--radius-card)] p-4", s === "dat" ? "bg-mint" : s === "chua-dat" ? "bg-peach" : "bg-surface-2")}>
            <p className="font-display text-4xl font-extrabold tabular-nums">
              {count(s)}
              <span className="text-lg font-bold text-muted">/{graded.length}</span>
            </p>
            <p className="text-sm font-semibold">{STATUS[s].label}</p>
          </div>
        ))}
      </section>

      {groups.map((g) => (
        <section key={g.id} className="space-y-3 break-inside-avoid-page">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">{g.title}</h2>
            {g.note && <p className="text-sm text-muted">{g.note}</p>}
          </div>
          {g.items.map((m) => (
            <MetricCard key={m.key} code={METRIC_GROUP[m.key]?.code ?? ""} m={m} />
          ))}
        </section>
      ))}

      <section className="space-y-3 break-inside-avoid-page">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Phiếu khảo sát trước và sau</h2>
          <p className="text-sm text-muted">
            Dùng cho các tiêu chí C3, R3, R4 (và A1, B4 khi phiếu có câu TĐ). Chọn file CSV của phiếu trước và phiếu sau, ở cả lớp dùng F-Mood và lớp không dùng.
          </p>
        </div>
        <SurveyUpload stored={stored} save={save} survey={survey} appClasses={appClasses} demo={Boolean(demoSurvey)} />
        {pairs && <AfterItems pairs={pairs.filter((p) => p.group === "app")} />}
      </section>

      <footer className="rounded-[var(--radius-card)] bg-sky p-5 text-sm leading-relaxed">
        <p className="font-semibold">Cách đọc báo cáo</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">
          <li>
            <strong className="text-ink">Đạt</strong>: con số đạt mục tiêu. <strong className="text-ink">Chưa đạt</strong>: có đủ dữ liệu nhưng chưa tới
            mục tiêu. <strong className="text-ink">Chưa đủ dữ liệu</strong>: quá ít để kết luận, nên không kết luận.{" "}
            <strong className="text-ink">Tham khảo</strong>: chỉ hiện số, không chấm Đạt hay Chưa đạt.
          </li>
          <li>Bộ thử an toàn chạy lần gần nhất: {runs.risk ? when(runs.risk) : "chưa chạy"}. Bộ thử câu trả lời: {runs.reply ? when(runs.reply) : "chưa chạy"}.</li>
          <li>Phiếu khảo sát không dùng để chẩn đoán ai; chỉ so trung bình của nhóm. Báo cáo không có tên hay mã của học sinh.</li>
        </ul>
      </footer>
    </div>
  );
}

function MetricCard({ code, m }: { code: string; m: Metric }) {
  const s = STATUS[m.status];
  return (
    <article className="break-inside-avoid rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start gap-4">
        <span className={cn("flex min-w-28 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold", s.cls)}>
          <span aria-hidden>{s.mark}</span> {s.label}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold leading-snug tracking-tight">
            <span className="text-muted">{code}. </span>
            {m.title}
          </h3>
          <p className="mt-1 text-[17px] font-semibold">{m.value}</p>
          <p className="mt-1 text-sm text-muted">
            {m.finalTarget ? `Mục tiêu ${STAGES[CURRENT_STAGE].name.toLowerCase()}` : "Mục tiêu"}: {m.target} · Tính trên: {m.basis}
          </p>
          {m.finalTarget && (
            <p className="mt-1 text-sm text-muted">
              Đích cuối: {m.finalTarget}
              {m.status === "dat" && <span className="ml-1 font-semibold text-ink">(đạt {STAGES[CURRENT_STAGE].name.toLowerCase()}, chưa xét đích cuối)</span>}
            </p>
          )}
          {m.extra && <p className="mt-1 text-sm">{m.extra}</p>}
        </div>
      </div>
      {m.compare && <Compare c={m.compare} />}
      <p className="mt-3 border-t border-line pt-3 text-sm leading-relaxed text-muted">
        <span className="font-semibold text-ink">Cách tính: </span>
        {m.how}
      </p>
    </article>
  );
}

/** Trước → sau của hai nhóm, và hiệu hai mức thay đổi. */
function Compare({ c }: { c: NonNullable<Metric["compare"]> }) {
  const rows = [
    { label: "Lớp dùng F-Mood", g: c.app, tone: "bg-[var(--series-pos)]" },
    { label: "Lớp không dùng", g: c.control, tone: "bg-[var(--series-neu)]" },
  ];
  const sign = (x: number) => (x > 0 ? `+${vn(x)}` : vn(x));
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl bg-surface-2 p-4">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="text-left text-muted">
            <th className="pb-2 font-medium">Nhóm</th>
            <th className="pb-2 text-right font-medium">Số bạn</th>
            <th className="pb-2 text-right font-medium">Trước</th>
            <th className="pb-2 text-right font-medium">Sau</th>
            <th className="pb-2 text-right font-medium">Thay đổi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-line">
              <td className="py-2">
                <span className={cn("mr-2 inline-block size-2.5 rounded-full", r.tone)} aria-hidden />
                {r.label}
              </td>
              <td className="py-2 text-right tabular-nums">{r.g.n}</td>
              <td className="py-2 text-right tabular-nums">{r.g.n ? vn(r.g.before) : "–"}</td>
              <td className="py-2 text-right tabular-nums">{r.g.n ? vn(r.g.after) : "–"}</td>
              <td className="py-2 text-right font-semibold tabular-nums">{r.g.n ? sign(r.g.change) : "–"}</td>
            </tr>
          ))}
          <tr className="border-t border-line">
            <td className="pt-2 font-semibold" colSpan={4}>
              Chênh lệch (lớp dùng − lớp không dùng)
            </td>
            <td className="pt-2 text-right font-display text-lg font-extrabold tabular-nums">
              {c.app.n && c.control.n ? sign(c.diff) : "–"}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="mt-1 text-xs text-muted">Đơn vị: {c.unit}</p>
    </div>
  );
}

type SurveyState = {
  pre: ParsedSurvey;
  post: ParsedSurvey;
  error?: string;
  classes: string[];
  paired: ReturnType<typeof pairSurveys> | null;
} | null;

function SurveyUpload({
  stored,
  save,
  survey,
  appClasses,
  demo,
}: {
  stored: Stored;
  save: (s: Stored) => void;
  survey: SurveyState;
  appClasses: string[];
  demo: boolean;
}) {
  async function read(which: "pre" | "post", file: File | undefined) {
    if (!file) return;
    save({ ...stored, [which]: await file.text() });
  }
  const groupOf = (c: string) => stored.groups[c] ?? defaultGroup(c, appClasses);
  const skippedText = (p: ParsedSurvey) =>
    `${p.rows.length} phiếu hợp lệ · bỏ ${p.skipped.test} phiếu thử, ${p.skipped.duplicate} phiếu trùng mã (giữ lần đầu), ${p.skipped.incomplete} phiếu thiếu câu`;

  return (
    <div className="rounded-[var(--radius-card)] border-2 border-dashed border-line p-5 print:border-0 print:p-0">
      {demo ? (
        <p className="text-sm print:hidden">
          <strong>Phiếu khảo sát MẪU</strong> của 3 lớp mẫu dùng F-Mood và lớp mẫu 8D không dùng app, đọc bằng đúng đoạn code đọc file CSV thật.
        </p>
      ) : (
      <div className="print:hidden">
        <p className="font-semibold">Kết quả khảo sát</p>
        <p className="mt-1 text-sm text-muted">
          Trong Google Sheets “F-Mood_Kết quả hiệu quả”, mở tab <strong>Phản hồi trước</strong> rồi chọn Tệp → Tải xuống → CSV; làm tương tự với tab{" "}
          <strong>Phản hồi sau</strong>. Chọn hai file ở đây. File chỉ được đọc trên máy này, không tải lên đâu cả.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(["pre", "post"] as const).map((w) => (
            <label key={w} className="block rounded-2xl bg-surface-2 p-3 text-sm">
              <span className="mb-1 block font-semibold">{w === "pre" ? "Phiếu trước khi dùng thử (CSV)" : "Phiếu sau khi dùng thử (CSV)"}</span>
              <input type="file" accept=".csv,text/csv" onChange={(e) => read(w, e.target.files?.[0])} className="w-full text-sm" />
              {stored[w] && <span className="mt-1 block text-xs text-muted">Đã chọn file.</span>}
            </label>
          ))}
        </div>
      </div>
      )}

      {survey?.error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-danger">
          {survey.error}
        </p>
      )}
      {survey && !survey.error && (
        <div className="mt-3 space-y-3 text-sm">
          <p>Phiếu trước: {skippedText(survey.pre)}.</p>
          <p>Phiếu sau: {skippedText(survey.post)}.</p>
          {survey.paired && (
            <p className="font-semibold">
              Ghép được {survey.paired.pairs.length} bạn có đủ hai phiếu ({survey.paired.pairs.filter((p) => p.group === "app").length} lớp dùng F-Mood,{" "}
              {survey.paired.pairs.filter((p) => p.group === "control").length} lớp không dùng). {survey.paired.unpaired.preOnly} bạn chỉ có phiếu trước,{" "}
              {survey.paired.unpaired.postOnly} bạn chỉ có phiếu sau: không tính.
            </p>
          )}
          <fieldset className="print:hidden">
            <legend className="mb-2 font-semibold">Mỗi lớp thuộc nhóm nào?</legend>
            <p className="mb-2 text-muted">Lớp có trong F-Mood được chọn sẵn là “Dùng F-Mood”. Lớp khác cần chọn; chưa chọn thì không được tính.</p>
            <ul className="space-y-2">
              {survey.classes.map((c) => (
                <li key={c} className="flex flex-wrap items-center gap-2">
                  <span className="w-28 font-semibold">{c}</span>
                  {(
                    [
                      ["app", "Dùng F-Mood"],
                      ["control", "Không dùng"],
                      ["skip", "Không tính"],
                    ] as const
                  ).map(([g, label]) => (
                    <button
                      key={g}
                      type="button"
                      aria-pressed={groupOf(c) === g}
                      onClick={() => save({ ...stored, groups: { ...stored.groups, [c]: g } })}
                      className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", groupOf(c) === g ? "bg-ink text-bg" : "border border-line bg-surface")}
                    >
                      {label}
                    </button>
                  ))}
                </li>
              ))}
            </ul>
          </fieldset>
          {!demo && (
            <button type="button" onClick={() => save({ pre: "", post: "", groups: {} })} className={cn(btn.ghost, "-ml-4 print:hidden")}>
              Bỏ file khảo sát
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Câu chỉ có ở phiếu sau (lớp dùng F-Mood): tỉ lệ đồng ý, ẩn khi dưới 5 bạn. Không dùng để chấm Đạt. */
function AfterItems({ pairs }: { pairs: { after: Record<string, number> }[] }) {
  return (
    <div className="break-inside-avoid rounded-[var(--radius-card)] border border-line bg-surface p-5 text-sm">
      <p className="font-semibold">Thông tin thêm: học sinh lớp dùng F-Mood nói gì (phiếu sau)</p>
      <ul className="mt-2 space-y-1">
        {AFTER_ITEMS.map((q) => {
          const answers = pairs.map((p) => p.after[q.code]).filter((x): x is number => typeof x === "number");
          const agree = answers.filter((x) => x >= 4).length;
          return (
            <li key={q.code} className="flex flex-wrap justify-between gap-2">
              <span>{q.text}</span>
              <span className="font-semibold tabular-nums">
                {answers.length >= MIN_GROUP ? `${agree}/${answers.length} đồng ý (${Math.round((agree / answers.length) * 100)}%)` : `chưa đủ dữ liệu (${answers.length} bạn)`}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-muted">“Đồng ý” = chọn 4 hoặc 5 trên thang 1–5.</p>
    </div>
  );
}

function downloadCsv(rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "fmood-bao-cao-hieu-qua.csv";
  a.click();
  URL.revokeObjectURL(url);
  // nhật ký hoạt động: ghi là đã xuất (không gửi lại số liệu)
  void recordExport("Báo cáo hiệu quả", rows.length - 1, window.location.pathname).catch(() => {});
}
