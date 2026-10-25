"use client";

import { useState, useTransition } from "react";
import { moveStudent } from "@/app/actions/admin";
import { deleteStudent, resetStudentPassword, setStudentLocked } from "@/app/actions/staff";
import { cn } from "@/components/ui/cn";
import { TempPassword } from "../TempPassword";

type Student = {
  id: string;
  nickname: string;
  full_name: string | null;
  class_id: string | null;
  class_name: string | null;
  created_at: string;
  locked_at: string | null;
};

export function StudentsAdmin({ students, classes }: { students: Student[]; classes: { id: string; name: string }[] }) {
  const [q, setQ] = useState("");
  const [cls, setCls] = useState("");
  const query = q.trim().toLowerCase();
  const shown = students.filter(
    (s) =>
      (!cls || (cls === "none" ? !s.class_id : s.class_id === cls)) &&
      (!query || s.nickname.toLowerCase().includes(query) || s.full_name?.toLowerCase().includes(query)),
  );

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo họ tên hoặc biệt danh"
          aria-label="Tìm học sinh"
          className="min-w-0 flex-1 rounded-full border border-line bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand"
        />
        <select value={cls} onChange={(e) => setCls(e.target.value)} aria-label="Lọc theo lớp" className="rounded-full border border-line bg-surface px-4 py-2.5 text-sm">
          <option value="">Mọi lớp ({students.length})</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              Lớp {c.name}
            </option>
          ))}
          <option value="none">Chưa có lớp</option>
        </select>
      </div>
      <p className="mb-2 text-sm text-muted">
        {shown.length} học sinh. Chỉ hiện thông tin tài khoản, không có nội dung riêng tư.
      </p>
      <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
        {shown.map((s) => (
          <Row key={s.id} s={s} classes={classes} />
        ))}
        {shown.length === 0 && <li className="p-6 text-center text-sm text-muted">Không có học sinh nào.</li>}
      </ul>
    </div>
  );
}

function Row({ s, classes }: { s: Student; classes: { id: string; name: string }[] }) {
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const label = s.full_name ?? s.nickname;

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
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {label}
            {s.locked_at && <span className="ml-2 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-bold text-danger">Đã khóa</span>}
          </p>
          <p className="text-xs text-muted">
            “{s.nickname}” · {s.class_name ? `Lớp ${s.class_name}` : "Chưa có lớp"} · tham gia{" "}
            {new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(s.created_at))}
          </p>
        </div>
        <div className={cn("flex flex-wrap items-center gap-1.5", pending && "opacity-50")}>
          <select
            value={s.class_id ?? ""}
            disabled={pending}
            aria-label={`Lớp của ${label}`}
            onChange={(e) => {
              const to = e.target.value || null;
              if (confirm(`Chuyển ${label} sang ${to ? `lớp ${classes.find((c) => c.id === to)?.name}` : "không có lớp"}?`)) {
                run(() => moveStudent(s.id, to));
              }
            }}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold"
          >
            <option value="">Không có lớp</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                Lớp {c.name}
              </option>
            ))}
          </select>
          <Btn disabled={pending} onClick={() => confirm(`Đặt mật khẩu tạm mới cho ${label}?`) && run(() => resetStudentPassword(s.id))}>
            Đặt lại mật khẩu
          </Btn>
          <Btn disabled={pending} onClick={() => confirm(s.locked_at ? `Mở khóa ${label}?` : `Khóa ${label}?`) && run(() => setStudentLocked(s.id, !s.locked_at))}>
            {s.locked_at ? "Mở khóa" : "Khóa"}
          </Btn>
          <Btn danger disabled={pending} onClick={() => confirm(`Xóa vĩnh viễn tài khoản và dữ liệu của ${label}?`) && run(() => deleteStudent(s.id))}>
            Xóa
          </Btn>
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      {password && <TempPassword student password={password} who={label} onClose={() => setPassword(null)} />}
    </li>
  );
}

function Btn({ children, danger, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
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
