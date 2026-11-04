"use client";

import { useState, useTransition } from "react";
import { resetPagePermissions, setPagePermission } from "@/app/actions/permissions";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import {
  cellNote,
  describeChanges,
  defaultGrants,
  pageSections,
  PERM_GROUP_LABEL,
  PERM_GROUPS,
  type Grants,
  type PermGroup,
} from "@/lib/permissions-shared";

type Status = { ok: boolean; text: string } | null;

/** Bảng tích trang × nhóm, gom theo nhóm của thanh bên. Mỗi ô lưu ngay khi bấm. */
export function PermissionTable({ initial, updated }: { initial: Grants; updated: string | null }) {
  const [grants, setGrants] = useState(initial);
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pending, start] = useTransition();
  const changed = describeChanges(defaultGrants(), grants).length;

  function toggle(href: string, group: PermGroup, on: boolean, label: string) {
    const key = `${href}|${group}`;
    setBusy(key);
    start(async () => {
      setStatus(null);
      const res = await setPagePermission(href, group, on);
      setBusy(null);
      if (res.ok) {
        setGrants(res.grants);
        setStatus({ ok: true, text: `Đã lưu: ${label} ${on ? "mở cho" : "bỏ"} ${PERM_GROUP_LABEL[group]}.` });
      } else setStatus({ ok: false, text: res.error });
    });
  }

  function reset() {
    start(async () => {
      setStatus(null);
      const res = await resetPagePermissions();
      setConfirmReset(false);
      if (res.ok) {
        setGrants(res.grants);
        setStatus({ ok: true, text: "Đã khôi phục quyền mặc định." });
      } else setStatus({ ok: false, text: res.error });
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm">
          {changed === 0 ? (
            <span className="rounded-full bg-mint px-3 py-1 font-semibold">Đang dùng quyền mặc định</span>
          ) : (
            <span className="rounded-full bg-butter px-3 py-1 font-semibold">Đã đổi {changed} ô so với mặc định</span>
          )}
          {updated && <span className="ml-2 text-xs text-muted">Lưu gần nhất: {updated}</span>}
        </p>
        {changed > 0 &&
          (confirmReset ? (
            <span className="flex flex-wrap items-center gap-2 text-sm">
              Đưa mọi ô về mặc định?
              <button type="button" disabled={pending} onClick={reset} className={btn.primary}>
                Khôi phục
              </button>
              <button type="button" onClick={() => setConfirmReset(false)} className={btn.ghost}>
                Thôi
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmReset(true)} className={btn.secondary}>
              ↺ Khôi phục mặc định
            </button>
          ))}
        <p role="status" aria-live="polite" className={cn("text-sm", status?.ok === false ? "text-danger" : "text-muted")}>
          {status?.text}
        </p>
      </div>

      {pageSections().map((section) => (
        <section key={section.title} className="rounded-[var(--radius-card)] border border-line bg-surface">
          <h2 className="px-5 pt-4 font-display text-lg font-bold tracking-tight">{section.title}</h2>
          <div className="overflow-x-auto px-2 pb-2">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Trang
                  </th>
                  {PERM_GROUPS.map((g) => (
                    <th key={g} scope="col" className="w-24 px-2 py-2 text-center font-semibold">
                      {PERM_GROUP_LABEL[g]}
                    </th>
                  ))}
                  <th scope="col" className="w-20 px-2 py-2 text-center font-semibold">
                    Admin
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {section.pages.map((p) => (
                  <tr key={p.href}>
                    <th scope="row" className="px-3 py-2.5 text-left font-normal">
                      <span className="font-semibold">
                        <span aria-hidden>{p.emoji}</span> {p.label}
                      </span>
                      <span className="block text-xs text-muted">{p.description}</span>
                    </th>
                    {PERM_GROUPS.map((g) => {
                      const on = (grants[p.href] ?? []).includes(g);
                      const note = cellNote(p.href, g);
                      const label = `${p.label}: ${PERM_GROUP_LABEL[g]}`;
                      return (
                        <td key={g} className="px-2 py-2.5 text-center">
                          <span className="inline-flex items-center gap-1" title={note ?? undefined}>
                            <input
                              type="checkbox"
                              aria-label={note ? `${label}. Lưu ý: ${note}` : label}
                              checked={on}
                              disabled={pending}
                              onChange={(e) => toggle(p.href, g, e.target.checked, p.label)}
                              className={cn("size-5 cursor-pointer accent-[var(--brand)] disabled:cursor-wait", busy === `${p.href}|${g}` && "opacity-50")}
                            />
                            {note && (
                              <span aria-hidden className="text-xs">
                                ⚠️
                              </span>
                            )}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-2 py-2.5 text-center text-muted" title="Admin luôn mở được mọi trang">
                      <span aria-hidden>✓ 🔒</span>
                      <span className="sr-only">Admin luôn mở được</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
