"use client";

import { useMemo, useState } from "react";
import { saveContentData, setContentStatus, setGroupStatus } from "@/app/actions/support-content";
import { StatusText, useAction } from "@/components/admin/AdminUI";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import {
  CONTENT_STATUSES,
  KIND_INFO,
  KIND_ORDER,
  type ContentKind,
  type ContentStatus,
  type FieldSpec,
  type SupportItem,
} from "@/lib/support-content";

const STATUS_TONE: Record<ContentStatus, string> = {
  off: "bg-surface text-ink ring-1 ring-line",
  test: "bg-butter text-ink",
  on: "bg-brand text-brand-ink",
};

const WHO_LABEL: Record<string, string> = { parent: "Bố mẹ", teacher: "Thầy cô", friend: "Bạn thân" };
const DATE = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });

/** Trang duyệt: lọc theo loại / chủ đề, đổi trạng thái từng mục hoặc cả nhóm, sửa chữ. */
export function ContentReview({ items }: { items: SupportItem[] }) {
  const [kind, setKind] = useState<ContentKind>("topic");
  const topics = useMemo(
    () =>
      items
        .filter((i) => i.kind === "topic" && i.topic)
        .map((i) => ({ key: i.topic as string, label: `${i.data.emoji} ${i.data.label}` })),
    [items],
  );
  const topicLabel = (t: string | null) => (t ? (topics.find((x) => x.key === t)?.label ?? t) : "Dùng chung");

  const counts = CONTENT_STATUSES.map((s) => ({ ...s, n: items.filter((i) => i.status === s.value).length }));
  const ofKind = items.filter((i) => i.kind === kind).sort((a, b) => a.sortOrder - b.sortOrder);
  // chủ đề: một nhóm chung; loại khác: nhóm theo chủ đề, "Dùng chung" đứng đầu
  const groups =
    kind === "topic" ? [null] : [...new Set(ofKind.map((i) => i.topic))].sort((a, b) => (a === null ? -1 : b === null ? 1 : 0));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" aria-label="Số mục theo trạng thái">
        {counts.map((c) => (
          <span key={c.value} className={cn("rounded-full px-3 py-1 text-sm font-semibold", STATUS_TONE[c.value])}>
            {c.label}: {c.n}
          </span>
        ))}
      </div>

      <nav aria-label="Loại nội dung" className="flex flex-wrap gap-2">
        {KIND_ORDER.filter((k) => items.some((i) => i.kind === k)).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={k === kind}
            onClick={() => setKind(k)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition",
              k === kind ? "border-ink bg-ink text-bg" : "border-line bg-surface hover:border-ink/30",
            )}
          >
            {KIND_INFO[k].label} <span className="opacity-60">{items.filter((i) => i.kind === k).length}</span>
          </button>
        ))}
      </nav>

      <p className="max-w-2xl text-sm text-muted">{KIND_INFO[kind].hint}</p>

      {groups.map((topic) => (
        <Group
          key={topic ?? "chung"}
          title={kind === "topic" ? "Các chủ đề" : topicLabel(topic)}
          kind={kind}
          topic={topic}
          items={kind === "topic" ? ofKind : ofKind.filter((i) => i.topic === topic)}
          groupable={kind !== "topic"}
        />
      ))}
    </div>
  );
}

function Group({
  title,
  kind,
  topic,
  items,
  groupable,
}: {
  title: string;
  kind: ContentKind;
  topic: string | null;
  items: SupportItem[];
  groupable: boolean;
}) {
  const { pending, status, run } = useAction();
  const readOnly = kind === "crisis_draft";
  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold tracking-tight">
          {title} <span className="text-sm font-medium text-muted">· {items.length} mục</span>
        </h2>
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">{groupable ? "Đặt cả nhóm:" : "Đặt tất cả chủ đề:"}</span>
            {CONTENT_STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                disabled={pending}
                onClick={() => {
                  if (confirm(`Đặt cả ${items.length} mục "${title}" thành "${s.label}"?`)) {
                    run(() => setGroupStatus(kind, groupable ? topic : null, s.value), "Đã đổi cả nhóm.");
                  }
                }}
                className="rounded-full border border-line px-3 py-1 font-semibold hover:border-ink/30"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <StatusText status={status} />
      <ul className="mt-3 divide-y divide-line">
        {items.map((item) => (
          <ItemRow key={item.id} item={item} readOnly={readOnly} />
        ))}
      </ul>
    </section>
  );
}

function ItemRow({ item, readOnly }: { item: SupportItem; readOnly: boolean }) {
  const [editing, setEditing] = useState(false);
  const { pending, status, run } = useAction();

  return (
    <li className="py-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div className="min-w-0 flex-1">
          {editing ? (
            <EditForm item={item} onDone={() => setEditing(false)} />
          ) : (
            <Preview item={item} />
          )}
          <p className="mt-1.5 text-xs text-muted">
            {item.reviewedAt ? `Cập nhật bởi ${item.reviewedByName ?? "?"} lúc ${DATE.format(new Date(item.reviewedAt))}` : "Chưa ai xem"}
            {" · "}
            <code>{item.key}</code>
          </p>
        </div>
        {readOnly ? (
          <span className="shrink-0 rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-muted">Chỉ để đọc</span>
        ) : (
          <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
            <div role="radiogroup" aria-label="Trạng thái" className="flex rounded-full bg-surface-2 p-1">
              {CONTENT_STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  role="radio"
                  aria-checked={item.status === s.value}
                  disabled={pending}
                  onClick={() => item.status !== s.value && run(() => setContentStatus(item.id, s.value), `Đã đặt "${s.label}".`)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-bold transition",
                    item.status === s.value ? STATUS_TONE[s.value] : "text-muted hover:text-ink",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {!editing && (
              <button type="button" onClick={() => setEditing(true)} className="text-sm font-semibold text-muted underline-offset-4 hover:text-ink hover:underline">
                Sửa
              </button>
            )}
            <StatusText status={status} />
          </div>
        )}
      </div>
    </li>
  );
}

/** Xem trước gần giống học sinh sẽ thấy. */
function Preview({ item }: { item: SupportItem }) {
  const d = item.data as Record<string, unknown>;
  switch (item.kind) {
    case "topic":
      return (
        <div>
          <span className="inline-flex items-center gap-2 rounded-2xl border-2 border-line bg-surface px-4 py-2 font-semibold">
            <span className="text-2xl" aria-hidden>
              {String(d.emoji)}
            </span>
            {String(d.label)}
          </span>
          <p className="mt-2 text-xs text-muted">Cụm từ nhận diện: {(d.triggers as string[]).join(" · ")}</p>
        </div>
      );
    case "tiny_action":
      return (
        <div className="rounded-2xl bg-mint/60 p-3">
          <p className="font-semibold">
            {typeof d.code === "string" && <span className="mr-2 rounded-full bg-surface px-2 py-0.5 text-xs font-bold">{d.code}</span>}
            {String(d.title)} <span className="text-sm font-medium text-muted">· {String(d.minutes)} phút</span>
          </p>
          {typeof d.when === "string" && <p className="mt-1 text-sm">Dùng khi: {d.when}</p>}
          <ol className="mt-1 list-decimal pl-5 text-sm">
            {(d.steps as string[]).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          {typeof d.reflect === "string" && <p className="mt-1 text-sm">Nhìn lại: “{d.reflect}”</p>}
          {Array.isArray(d.cues) && d.cues.length > 0 && (
            <p className="mt-1 text-xs text-muted">Gợi ý khi khó khăn có: {(d.cues as string[]).join(" · ")}</p>
          )}
          {typeof d.maxLevel === "number" && <p className="mt-1 text-xs text-muted">Chỉ gợi ý khi mức lo ≤ {d.maxLevel}</p>}
          {typeof d.lessonSlug === "string" && <p className="mt-1 text-xs text-muted">Bài học liên quan: {d.lessonSlug}</p>}
        </div>
      );
    case "badge":
      return (
        <div className="flex items-start gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-butter text-2xl" aria-hidden>
            {String(d.emoji)}
          </span>
          <div>
            <p className="font-semibold">{String(d.name)}</p>
            <p className="text-sm">{String(d.description)}</p>
            <p className="text-xs text-muted">Cách nhận: {String(d.how)}</p>
          </div>
        </div>
      );
    case "opener":
      return (
        <p>
          <span className="mr-2 rounded-full bg-sky px-2 py-0.5 text-xs font-semibold">{WHO_LABEL[String(d.who)]}</span>
          “{String(d.text)}”
        </p>
      );
    case "ask":
    case "may_line": {
      const field = KIND_INFO[item.kind].fields[0];
      const tag = field.options?.find((o) => o.value === d[field.name])?.label;
      return (
        <p>
          {tag && <span className="mr-2 rounded-full bg-lilac px-2 py-0.5 text-xs font-semibold">{tag}</span>}
          <span className="rounded-2xl rounded-bl-md bg-surface-2 px-3 py-1.5">{String(d.text)}</span>
        </p>
      );
    }
    default:
      return <p className="whitespace-pre-wrap">{String(d.text)}</p>;
  }
}

function EditForm({ item, onDone }: { item: SupportItem; onDone: () => void }) {
  const fields = KIND_INFO[item.kind].fields;
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map((f) => {
        const v = item.data[f.name];
        return [f.name, Array.isArray(v) ? v.join("\n") : v === undefined ? "" : String(v)];
      }),
    ),
  );
  const { pending, status, run } = useAction();

  function toData() {
    // giữ các phần không có ô sửa (ví dụ nút đi tiếp của việc nhỏ)
    const data: Record<string, unknown> = Object.fromEntries(Object.entries(item.data).filter(([k]) => !fields.some((f) => f.name === k)));
    for (const f of fields) {
      const raw = values[f.name] ?? "";
      // ô không bắt buộc để trống thì bỏ đi
      if (!raw.trim() && f.optional) continue;
      data[f.name] = f.type === "list" ? raw.split("\n").map((s) => s.trim()).filter(Boolean) : f.type === "number" ? Number(raw) : raw;
    }
    return data;
  }

  return (
    <form
      action={() => run(() => saveContentData(item.id, toData()), "Đã lưu.", onDone)}
      className="space-y-3 rounded-2xl border border-line bg-surface-2/50 p-3"
    >
      {fields.map((f) => (
        <FieldInput key={f.name} field={f} value={values[f.name] ?? ""} onChange={(v) => setValues({ ...values, [f.name]: v })} />
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={cn(btn.primary, "px-5 py-2")}>
          {pending ? "Đang lưu…" : "Lưu"}
        </button>
        <button type="button" onClick={onDone} className={btn.ghost}>
          Hủy
        </button>
        <StatusText status={status} />
      </div>
    </form>
  );
}

function FieldInput({ field, value, onChange }: { field: FieldSpec; value: string; onChange: (v: string) => void }) {
  const common = { id: `f-${field.name}`, value, onChange: (e: { target: { value: string } }) => onChange(e.target.value) };
  return (
    <label className="block" htmlFor={common.id}>
      <span className="mb-1 block text-sm font-semibold">{field.label}</span>
      {field.type === "select" ? (
        <select {...common} className={input}>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.type === "textarea" || field.type === "list" ? (
        <textarea {...common} rows={field.type === "list" ? 5 : 3} className={cn(input, "resize-y")} />
      ) : (
        <input {...common} type={field.type === "number" ? "number" : "text"} className={input} />
      )}
    </label>
  );
}
