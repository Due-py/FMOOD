import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { evalData } from "@/lib/admin-data";
import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/admin/AdminUI";
import { cn } from "@/components/ui/cn";
import type { EvalResult } from "@/app/actions/admin";
import { CaseList, RunButton } from "./EvalForms";

export const metadata: Metadata = { title: "Bộ thử của Mây" };

const LEVEL_LABEL: Record<string, string> = { none: "Bình thường", concern: "Đáng lo", urgent: "Khẩn cấp" };

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "numeric", month: "numeric" }).format(new Date(iso));
}

export default async function EvalPage() {
  await requireStaff(["admin"]);
  const { cases, runs } = await evalData();
  const last = runs[0];
  const failed = last ? (last.results as EvalResult[]).filter((r) => !r.ok) : [];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Nghiên cứu" title="Bộ thử của Mây" action={<RunButton count={cases.filter((c) => c.active).length} />}>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Các câu mẫu kèm mức đúng mong đợi. Bấm chạy để xem Mây có nhận ra nguy hiểm đúng không, và có báo nhầm những câu
          nói quá không. Nên chạy lại mỗi khi sửa tiêu chí phân loại, cụm từ hoặc đổi model.
        </p>
      </PageHeader>

      {last && (
        <Section
          title={`Lần chạy gần nhất: ${last.passed}/${last.total} câu đúng`}
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
        <Section title="Lịch sử">
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

      <Section title={`Câu thử (${cases.length})`} description="Câu mẫu không được chứa thông tin thật của học sinh.">
        <CaseList cases={cases} />
      </Section>
    </div>
  );
}
