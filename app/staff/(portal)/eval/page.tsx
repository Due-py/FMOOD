import type { Metadata } from "next";
import { requirePage } from "@/lib/permissions";
import { evalData } from "@/lib/admin-data";
import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/admin/AdminUI";
import { cn } from "@/components/ui/cn";
import type { EvalResult } from "@/app/actions/admin";
import { SAFETY_CASE_GROUPS } from "@/lib/eval/safety-cases";
import { mergeSafetySuite, runnableRows } from "@/lib/eval/safety-suite";
import { CHECK_LABEL } from "@/lib/eval/reply-checks";
import { CARD_CASES, REPLY_CASES } from "@/lib/eval/reply-cases";
import { SEL_CASES } from "@/lib/eval/sel-cases";
import { LAM_HO_CASES } from "@/lib/eval/khong-lam-ho-cases";
import { QUY_KET_CASES } from "@/lib/eval/khong-quy-ket-cases";
import { TOPIC_CASES } from "@/lib/eval/topic-cases";
import { DOI_CHIEU_CASES } from "@/lib/eval/doi-chieu-cases";
import { AB_SCENARIOS } from "@/lib/eval/ab-scenarios";
import type { ReplyResult } from "@/lib/eval/reply-run";
import { CaseTable, RunButton, RunReplyButton } from "./EvalForms";

export const metadata: Metadata = { title: "Bộ thử của trợ lý" };

const LEVEL_LABEL: Record<string, string> = { none: "Bình thường", concern: "Đáng lo", urgent: "Khẩn cấp" };

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "numeric", month: "numeric" }).format(new Date(iso));
}

export default async function EvalPage() {
  await requirePage("/staff/eval");
  const { cases, added, runs, replyRuns } = await evalData();
  // câu có sẵn + câu thầy cô thêm, mỗi câu một lần (lib/eval/safety-suite.ts): nút Chạy dùng đúng danh sách này
  const rows = mergeSafetySuite(SAFETY_CASE_GROUPS, cases, added);
  const runnable = runnableRows(rows).length;
  const builtIn = rows.filter((r) => r.source === "ma").length;
  const fromPage = rows.filter((r) => r.source === "trang");
  const pageRunnable = fromPage.filter((r) => r.active && !r.duplicate).length;
  const duplicates = fromPage.filter((r) => r.duplicate).length;
  const lastReply = replyRuns[0];
  const replyFailed = lastReply ? (lastReply.results as ReplyResult[]).filter((r) => !r.ok) : [];
  const last = runs[0];
  const failed = last ? (last.results as EvalResult[]).filter((r) => !r.ok) : [];

  // mỗi bộ kiểm tra một việc khác nhau, nên mỗi bộ một số câu; chỉ bộ an toàn gộp câu có sẵn với câu thầy cô thêm
  const suites: { name: string; count: string; checks: string; where: string }[] = [
    {
      name: "An toàn",
      count: `${runnable} (${builtIn} có sẵn + ${pageRunnable} thầy cô thêm)`,
      checks: "Xếp đúng mức nguy cơ; không bỏ sót câu nguy hiểm, không báo nhầm câu nói quá",
      where: "Nút Chạy ở trang này · npm run eval:safety:3 (chỉ câu có sẵn)",
    },
    { name: "Câu trả lời", count: String(REPLY_CASES.length), checks: "Xưng hô, ngắn gọn, có hỏi lại, gợi ý người lớn khi cần", where: "Nút ở trang này · npm run eval:replies" },
    { name: "Thẻ gợi ý", count: String(CARD_CASES.length), checks: "Thẻ mục tiêu / kỹ năng / dừng hiện đúng lúc", where: "npm run eval:replies -- --the" },
    { name: "Mạch SEL", count: String(SEL_CASES.length), checks: "Bộ điều phối chọn đúng bước; một câu hỏi; không ép hết sợ", where: "npm run eval:sel" },
    { name: "Không làm hộ · không quy kết", count: `${LAM_HO_CASES.length} · ${QUY_KET_CASES.length}`, checks: "Không làm bài thay; không gán tính cách hay bệnh", where: "npm run eval:lamho:3" },
    { name: "Đoán chủ đề", count: String(TOPIC_CASES.length), checks: "Đoán đúng chủ đề từ lời kể", where: "npm run eval:topics" },
    { name: "Đối chiếu có AI / không AI", count: String(DOI_CHIEU_CASES.length), checks: "Góp ý bài luyện: so với tiêu chí cố định và chatbot chung (chấm mù)", where: "npm run doi-chieu" },
    { name: "So sánh A/B", count: String(AB_SCENARIOS.length), checks: "Lời dặn có và không có quy tắc xác nhận, đổi cách (chấm mù)", where: "npm run so-sanh:ab" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Nghiên cứu" title="Bộ thử của trợ lý" action={<RunButton count={runnable} />}>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Câu tự đặt, không lấy từ học sinh thật, mỗi câu kèm kết quả đúng mong đợi. Nên chạy lại mỗi khi sửa lời dặn, tiêu chí,
          cụm từ hoặc đổi model. Kết quả lần chạy an toàn gần nhất được dùng ở trang Kết quả.
        </p>
      </PageHeader>

      <Section
        title="Các bộ thử và vì sao số câu khác nhau"
        description="Mỗi bộ kiểm tra một việc khác nhau nên có số câu riêng, không cộng chung. Chỉ bộ an toàn gộp câu có sẵn trong mã với câu thầy cô thêm, và mỗi câu chỉ chạy một lần."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-2 pr-3 font-semibold">Bộ thử</th>
                <th className="py-2 pr-3 font-semibold">Số câu</th>
                <th className="py-2 pr-3 font-semibold">Kiểm tra gì</th>
                <th className="py-2 font-semibold">Chạy ở đâu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {suites.map((s) => (
                <tr key={s.name}>
                  <td className="py-2 pr-3 font-semibold">{s.name}</td>
                  <td className="py-2 pr-3 tabular-nums">{s.count}</td>
                  <td className="py-2 pr-3">{s.checks}</td>
                  <td className="py-2 font-mono text-xs">{s.where}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {last && (
        <Section
          title={`Lần chạy an toàn gần nhất: ${last.passed}/${last.total} câu đúng`}
          description={`${formatDateTime(last.created_at)} · ${last.run_by_name ?? ""} · model ${last.model ?? ""}`}
          className={last.passed === last.total ? "border-[var(--series-pos)]" : "border-danger/50"}
        >
          <div className="mb-3 h-3 overflow-hidden rounded-full bg-danger-soft">
            <div className="h-full rounded-full bg-[var(--series-pos)]" style={{ width: `${(last.passed / Math.max(1, last.total)) * 100}%` }} />
          </div>
          {failed.length === 0 ? (
            <p className="font-semibold">✅ Tất cả đều đúng.</p>
          ) : (
            <ul className="space-y-2">
              {failed.map((r) => (
                <li key={r.id} className="rounded-2xl bg-danger-soft p-3 text-sm">
                  <p className="font-semibold">“{r.input}”</p>
                  <p>
                    Mong đợi <strong>{LEVEL_LABEL[r.expected]}</strong>, nhận được <strong>{LEVEL_LABEL[r.got]}</strong>
                  </p>
                  {r.reasons.length > 0 && <p className="text-xs text-muted">{r.reasons.join(" · ")}</p>}
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {runs.length > 1 && (
        <Section title="Lịch sử" description="Số câu mỗi lần có thể khác nhau vì bộ câu được bổ sung dần.">
          <ul className="flex flex-wrap gap-2">
            {runs.map((r) => (
              <li key={r.id} className={cn("rounded-2xl px-3 py-2 text-sm", r.passed === r.total ? "bg-mint" : "bg-danger-soft")} title={r.model ?? ""}>
                <strong>
                  {r.passed}/{r.total}
                </strong>{" "}
                <span className="text-muted">{formatDateTime(r.created_at)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section
        title={`Câu thử an toàn (${runnable} câu chạy)`}
        description={`${builtIn} câu có sẵn trong mã, chia theo nhóm, cộng câu thầy cô thêm ở nhóm cuối.${duplicates ? ` ${duplicates} câu thầy cô thêm trùng câu có sẵn nên chỉ hiện, không chạy lại.` : ""} Câu mẫu không được chứa thông tin thật của học sinh.`}
      >
        <CaseTable rows={rows.map(({ history, ...r }) => ({ ...r, afterTurns: history.length }))} />
      </Section>

      <Section
        title="Bộ thử câu trả lời"
        description={`${REPLY_CASES.length} tin nhắn mẫu (không có câu nguy hiểm). Mỗi câu trả lời của trợ lý được máy kiểm tra: xưng "mình", gọi "bạn", không nói ai bị bệnh gì, không quá dài, có hỏi lại, và gợi ý tìm người lớn khi cần.`}
      >
        <RunReplyButton count={REPLY_CASES.length} />
        {lastReply && (
          <div className="mt-4 space-y-2">
            <p className="font-semibold">
              Lần gần nhất: {lastReply.passed}/{lastReply.total} câu đạt · {formatDateTime(lastReply.created_at)} · {lastReply.run_by_name ?? ""}
            </p>
            {replyFailed.map((r) => (
              <div key={r.id} className="rounded-2xl bg-danger-soft p-3 text-sm">
                <p className="font-semibold">“{r.message}”</p>
                <p className="mt-1">Trợ lý: {r.reply || r.error}</p>
                <p className="mt-1 text-xs text-muted">Chưa đạt: {r.failed.map((f) => CHECK_LABEL[f]).join(" · ") || "lỗi gọi AI"}</p>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
