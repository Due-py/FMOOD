"use client";

import { useState, useTransition } from "react";
import { setPasswordAfterReset } from "@/app/actions/account";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

export function NewPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="mt-5 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          // thành công thì máy chủ chuyển thẳng về trang chủ
          const res = await setPasswordAfterReset({
            password: String(data.get("password") ?? ""),
            confirm: String(data.get("confirm") ?? ""),
          });
          if (res && !res.ok) setError(res.error);
        });
      }}
    >
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Mật khẩu mới</span>
        <input name="password" type="password" required minLength={6} maxLength={72} autoComplete="new-password" className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Nhập lại mật khẩu mới</span>
        <input name="confirm" type="password" required minLength={6} maxLength={72} autoComplete="new-password" className={input} />
      </label>
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className={cn(btn.primary, "w-full")}>
        {pending ? "Đang lưu…" : "Lưu mật khẩu mới"}
      </button>
    </form>
  );
}
