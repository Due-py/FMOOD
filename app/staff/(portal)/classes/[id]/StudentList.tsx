"use client";

import { useState, useTransition } from "react";
import { deleteStudent, resetStudentPassword, setStudentLocked } from "@/app/actions/staff";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/components/ui/cn";
import type { AvatarView } from "@/lib/avatars";
import type { StudentRow } from "@/lib/staff";
import { TempPassword } from "../../TempPassword";

export function StudentList({
  students,
  avatars,
  canReset,
  isAdmin,
}: {
  students: StudentRow[];
  avatars: AvatarView[];
  canReset: boolean;
  isAdmin: boolean;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q
    ? students.filter((s) => s.nickname.toLowerCase().includes(q) || s.full_name?.toLowerCase().includes(q))
    : students;

  if (students.length === 0) {
    return <p className="rounded-3xl bg-surface-2 p-6 text-center text-muted">Chưa có học sinh nào đăng ký bằng mã lớp này.</p>;
  }

  return (
    <div>
      {students.length > 8 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo họ tên hoặc biệt danh"
          aria-label="Tìm học sinh"
          className="mb-3 w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand"
        />
      )}
      <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
        {shown.map((s) => (
          <StudentItem key={s.id} student={s} avatar={avatars[students.indexOf(s)]} canReset={canReset} isAdmin={isAdmin} />
        ))}
      </ul>
    </div>
  );
}

function StudentItem({
  student,
  avatar,
  canReset,
  isAdmin,
}: {
  student: StudentRow;
  avatar: AvatarView;
  canReset: boolean;
  isAdmin: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const label = student.full_name ?? student.nickname;

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
        <Avatar avatar={avatar} size={40} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {label}
            {student.locked_at && (
              <span className="ml-2 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-bold text-danger">Đã khóa</span>
            )}
          </p>
          <p className="text-xs text-muted">
            Biệt danh “{student.nickname}” · tham gia{" "}
            {new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(student.created_at))}
          </p>
        </div>
        <div className={cn("flex flex-wrap gap-1.5", pending && "opacity-50")}>
          {canReset && (
            <ActionButton
              disabled={pending}
              onClick={() => {
                if (confirm(`Đặt mật khẩu tạm mới cho ${label}?`)) run(() => resetStudentPassword(student.id));
              }}
            >
              Đặt lại mật khẩu
            </ActionButton>
          )}
          {isAdmin && (
            <>
              <ActionButton
                disabled={pending}
                onClick={() => {
                  const lock = !student.locked_at;
                  if (confirm(lock ? `Khóa tài khoản của ${label}?` : `Mở khóa tài khoản của ${label}?`)) {
                    run(() => setStudentLocked(student.id, lock));
                  }
                }}
              >
                {student.locked_at ? "Mở khóa" : "Khóa"}
              </ActionButton>
              <ActionButton
                danger
                disabled={pending}
                onClick={() => {
                  if (confirm(`Xóa vĩnh viễn tài khoản và toàn bộ dữ liệu của ${label}? Không khôi phục được.`)) {
                    run(() => deleteStudent(student.id));
                  }
                }}
              >
                Xóa
              </ActionButton>
            </>
          )}
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      {password && <TempPassword student password={password} who={label} onClose={() => setPassword(null)} />}
    </li>
  );
}

function ActionButton({
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
