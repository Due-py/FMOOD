"use client";

import { useRef, useState, useTransition } from "react";
import {
  createStaff,
  deleteStaff,
  resetStaffPassword,
  setStaffLocked,
  updateStaffRole,
} from "@/app/actions/staff";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import type { Role } from "@/lib/auth";
import type { StaffRow } from "@/lib/staff";
import { TempPassword } from "../TempPassword";

const ROLE_OPTIONS: { value: Exclude<Role, "student">; label: string }[] = [
  { value: "teacher", label: "Giáo viên chủ nhiệm" },
  { value: "counselor", label: "Phòng tham vấn" },
  { value: "admin", label: "Admin" },
];

export function NewStaffForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ who: string; password: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div>
      <form
        ref={formRef}
        action={(fd) =>
          startTransition(async () => {
            setError(null);
            const name = String(fd.get("name") ?? "");
            const res = await createStaff({
              name,
              email: String(fd.get("email") ?? ""),
              role: String(fd.get("role") ?? "teacher"),
            });
            if (!res.ok) setError(res.error);
            else {
              setCreated({ who: name, password: res.password });
              formRef.current?.reset();
            }
          })
        }
        className="grid gap-3 sm:grid-cols-3"
      >
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Họ và tên</span>
          <input name="name" required className={input} placeholder="VD: Nguyễn Thị Thanh Thúy" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Email</span>
          <input name="email" type="email" required className={input} placeholder="ten@truong.edu.vn" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Vai trò</span>
          <select name="role" defaultValue="teacher" className={input}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        {error && <p role="alert" className="text-sm text-danger sm:col-span-3">{error}</p>}
        <div className="sm:col-span-3">
          <button type="submit" disabled={pending} className={btn.primary}>
            {pending ? "Đang tạo…" : "Tạo tài khoản"}
          </button>
        </div>
      </form>
      {created && <TempPassword password={created.password} who={created.who} onClose={() => setCreated(null)} />}
    </div>
  );
}

export function StaffList({ staff, selfId }: { staff: StaffRow[]; selfId: string }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
      {staff.map((s) => (
        <StaffItem key={s.id} person={s} isSelf={s.id === selfId} />
      ))}
    </ul>
  );
}

function StaffItem({ person, isSelf }: { person: StaffRow; isSelf: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string; password?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Có lỗi xảy ra.");
      else if (res.password) setPassword(res.password);
    });
  }

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {person.name}
            {isSelf && <span className="ml-2 text-xs font-normal text-muted">(bạn)</span>}
            {person.locked_at && (
              <span className="ml-2 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-bold text-danger">Đã khóa</span>
            )}
          </p>
          <p className="truncate text-xs text-muted">
            {person.email}
            {person.classes.length > 0 && ` · chủ nhiệm ${person.classes.join(", ")}`}
          </p>
        </div>

        {isSelf ? (
          <span className="text-sm text-muted">{ROLE_OPTIONS.find((r) => r.value === person.role)?.label}</span>
        ) : (
          <div className={cn("flex flex-wrap items-center gap-1.5", pending && "opacity-50")}>
            <select
              value={person.role}
              disabled={pending}
              aria-label={`Vai trò của ${person.name}`}
              onChange={(e) => {
                const role = e.target.value as Role;
                if (confirm(`Đổi vai trò của ${person.name}?`)) run(() => updateStaffRole(person.id, role));
              }}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <SmallButton
              disabled={pending}
              onClick={() => {
                if (confirm(`Đặt mật khẩu tạm mới cho ${person.name}?`)) run(() => resetStaffPassword(person.id));
              }}
            >
              Đặt lại mật khẩu
            </SmallButton>
            <SmallButton
              disabled={pending}
              onClick={() => {
                const lock = !person.locked_at;
                if (confirm(lock ? `Khóa tài khoản ${person.name}?` : `Mở khóa ${person.name}?`)) {
                  run(() => setStaffLocked(person.id, lock));
                }
              }}
            >
              {person.locked_at ? "Mở khóa" : "Khóa"}
            </SmallButton>
            <SmallButton
              danger
              disabled={pending}
              onClick={() => {
                if (confirm(`Xóa tài khoản ${person.name}? Các lớp người này chủ nhiệm sẽ thành "chưa gán".`)) {
                  run(() => deleteStaff(person.id));
                }
              }}
            >
              Xóa
            </SmallButton>
          </div>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      {password && <TempPassword password={password} who={person.name} onClose={() => setPassword(null)} />}
    </li>
  );
}

function SmallButton({
  children,
  danger,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50",
        danger ? "border-danger/30 text-danger hover:bg-danger-soft" : "border-line hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}
