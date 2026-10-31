import type { Metadata } from "next";
import { requirePage } from "@/lib/permissions";
import { aiHealth, kbSummary } from "@/lib/admin-data";
import { getSetting } from "@/lib/settings";
import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/admin/AdminUI";
import { cn } from "@/components/ui/cn";
import { ModelsForm, PingButtons } from "./HealthForms";
import { VersionLine } from "../../VersionLine";

export const metadata: Metadata = { title: "Tình trạng trợ lý" };

const KIND_LABEL: Record<string, string> = {
  chat: "Trò chuyện",
  suggestions: "Gợi ý trả lời",
  classifier: "AI phân loại an toàn",
  moderation: "Moderation (dự phòng)",
  embedding: "Tra cứu / dạy lại",
  health: "Kiểm tra kết nối",
};

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "numeric", month: "numeric" }).format(new Date(iso));
}

export default async function HealthPage() {
  await requirePage("/staff/may/health");
  const [health, models, kb] = await Promise.all([aiHealth(), getSetting("ai.models"), kbSummary()]);
  const maxDaily = Math.max(1, ...health.daily.map((d) => d.chat));
  const totalTokens = health.byKind.reduce((s, k) => s + k.inputTokens + k.outputTokens, 0);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Trợ lý AI" title="Tình trạng trợ lý">
        <p className="mt-2 text-sm text-muted">Số liệu 7 ngày qua. Nhật ký chỉ ghi thời gian, số token và lỗi, không ghi nội dung tin nhắn.</p>
      </PageHeader>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Cơ sở dữ liệu" value={health.db.ok ? "Tốt" : "Lỗi"} sub={`${health.db.latencyMs} ms`} ok={health.db.ok} />
        <Tile label="Lượt trò chuyện" value={String(health.byKind[0].calls)} sub={`${health.byKind[0].errors} lỗi`} ok={health.byKind[0].errors === 0} />
        <Tile label="Kho kiến thức" value={`${kb.ready} tài liệu`} sub={`${kb.chunks} đoạn`} ok={kb.ready > 0} />
        <Tile label="Token đã dùng" value={totalTokens.toLocaleString("vi-VN")} sub="mọi loại gọi AI" ok />
      </section>

      <Section title="Kiểm tra kết nối AI" description="Gửi một câu rất ngắn tới từng model để chắc chắn đang hoạt động.">
        <PingButtons chat={models.chat} safety={models.safety} />
      </Section>

      <Section title="Lượt trò chuyện mỗi ngày">
        <div className="flex h-32 items-end gap-2 border-b border-line">
          {health.daily.map((d) => (
            <div key={d.day} className="flex h-full flex-1 flex-col justify-end" title={`${d.day}: ${d.chat} lượt, ${d.errors} lỗi`}>
              <div className="rounded-t bg-[var(--series-pos)]" style={{ height: `${(d.chat / maxDaily) * 100}%`, minHeight: d.chat ? 3 : 0 }} />
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-2 text-center text-[11px] text-muted">
          {health.daily.map((d) => (
            <span key={d.day} className="flex-1">
              {d.day.slice(8)}/{d.day.slice(5, 7)}
              <span className="block font-semibold text-ink">{d.chat}</span>
            </span>
          ))}
        </div>
      </Section>

      <Section title="Theo loại">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="py-2 font-medium">Loại</th>
                <th className="py-2 text-right font-medium">Lượt</th>
                <th className="py-2 text-right font-medium">Lỗi</th>
                <th className="py-2 text-right font-medium">Thời gian TB</th>
                <th className="py-2 text-right font-medium">Token vào / ra</th>
              </tr>
            </thead>
            <tbody>
              {health.byKind.map((k) => (
                <tr key={k.kind} className="border-b border-line last:border-0">
                  <td className="py-2">{KIND_LABEL[k.kind]}</td>
                  <td className="py-2 text-right tabular-nums">{k.calls}</td>
                  <td className={cn("py-2 text-right tabular-nums", k.errors > 0 && "font-semibold text-danger")}>{k.errors}</td>
                  <td className="py-2 text-right tabular-nums">{k.avgLatency != null ? `${(k.avgLatency / 1000).toFixed(1)} s` : "–"}</td>
                  <td className="py-2 text-right tabular-nums">
                    {k.inputTokens.toLocaleString("vi-VN")} / {k.outputTokens.toLocaleString("vi-VN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {health.recentErrors.length > 0 && (
        <Section title="Lỗi gần đây">
          <ul className="space-y-2 text-sm">
            {health.recentErrors.map((e, i) => (
              <li key={i} className="rounded-2xl bg-danger-soft p-3">
                <p className="font-semibold">
                  {KIND_LABEL[e.kind]} · {e.model} · {formatDateTime(e.created_at)}
                </p>
                <p className="break-all text-xs">{e.error}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Model đang dùng" description="Đổi model sẽ có hiệu lực ngay. Sau khi đổi model an toàn, nên chạy Bộ thử của trợ lý.">
        <ModelsForm key={JSON.stringify(models)} initial={models} />
      </Section>

      <VersionLine />
    </div>
  );
}

function Tile({ label, value, sub, ok }: { label: string; value: string; sub: string; ok: boolean }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
      <p className="flex items-center gap-2 text-sm text-muted">
        <span className={cn("size-2.5 rounded-full", ok ? "bg-[var(--series-pos)]" : "bg-danger")} aria-hidden />
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-extrabold tracking-tight">{value}</p>
      <p className="text-xs text-muted">{sub}</p>
    </div>
  );
}
