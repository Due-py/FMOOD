"use client";

import { useState, useTransition } from "react";
import { changeStaffPassword } from "@/app/actions/staff";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

export function StaffPasswordForm() {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          const res = await changeStaffPassword({
            password: String(fd.get("password") ?? ""),
            confirm: String(fd.get("confirm") ?? ""),
          });
          setMessage(res.ok ? { ok: true, text: "Đã đổi mật khẩu." } : { ok: false, text: res.error });
        })
      }
      className="space-y-2"
    >
      <input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="Mật khẩu mới (ít nhất 8 ký tự)" aria-label="Mật khẩu mới" className={input} />
      <input name="confirm" type="password" required minLength={8} autoComplete="new-password" placeholder="Nhập lại mật khẩu mới" aria-label="Nhập lại mật khẩu mới" className={input} />
      {message && (
        <p role="status" className={cn("text-sm", message.ok ? "text-brand-strong dark:text-brand" : "text-danger")}>
          {message.text}
        </p>
      )}
      <button type="submit" disabled={pending} className={btn.secondary}>
        {pending ? "Đang đổi…" : "Đổi mật khẩu"}
      </button>
    </form>
  );
}
