import { settingHistory, type SettingKey } from "@/lib/settings";
import { VersionButton } from "./VersionButton";

// "CÁC BẢN TRƯỚC" của một cài đặt Mây: mỗi lần lưu, bản cũ được cất lại để dùng lại khi cần.

function preview(key: SettingKey, value: unknown): string {
  const v = (value ?? {}) as Record<string, unknown>;
  const text =
    key === "ai.rules"
      ? v.text
      : key === "safety.classifier"
        ? v.prompt
        : key === "safety.crisis"
          ? v.message
          : key === "ai.persona"
            ? `${v.name ?? ""}: ${v.personality ?? ""}`
            : key === "safety.phrases"
              ? [...((v.urgent as string[]) ?? []), ...((v.concern as string[]) ?? [])].join(", ") || "(không có cụm từ thêm)"
              : JSON.stringify(value);
  const s = String(text ?? "").replace(/\s+/g, " ").trim();
  return s.length > 160 ? `${s.slice(0, 160)}…` : s;
}

function when(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "numeric", month: "numeric" }).format(
    new Date(iso),
  );
}

export async function SettingHistory({ settingKey }: { settingKey: SettingKey }) {
  const { ready, items } = await settingHistory(settingKey);
  return (
    <details className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <summary className="cursor-pointer font-semibold">
        Các bản trước {ready && items.length > 0 && <span className="font-normal text-muted">({items.length})</span>}
      </summary>
      {!ready ? (
        <p className="mt-3 text-sm text-muted">Cần chạy cập nhật cơ sở dữ liệu 0012 để giữ các bản trước.</p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Chưa có bản nào. Từ lần lưu tới, bản đang dùng sẽ được cất ở đây.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {items.map((v) => (
            <li key={v.id} className="flex flex-wrap items-start gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {when(v.saved_at)}
                  {v.saved_by_name && <span className="font-normal text-muted"> · {v.saved_by_name}</span>}
                </p>
                <p className="mt-0.5 text-sm text-muted">{preview(settingKey, v.value)}</p>
              </div>
              <VersionButton settingKey={settingKey} versionId={v.id} />
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
