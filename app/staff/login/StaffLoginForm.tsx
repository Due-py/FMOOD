"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

export function StaffLoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const { error } = await createClient().auth.signInWithPassword({
        email: String(formData.get("email") ?? "").trim().toLowerCase(),
        password: String(formData.get("password") ?? ""),
      });
      if (error) {
        setError(
          error.code === "user_banned"
            ? "Tài khoản này đang bị khóa. Liên hệ admin của trường."
            : error.status === 429
              ? "Thử quá nhiều lần. Đợi một lát rồi thử lại."
              : "Email hoặc mật khẩu chưa đúng.",
        );
        return;
      }
      // trang /staff tự kiểm tra vai trò (học sinh sẽ được đưa về trang của mình)
      router.replace("/staff");
      router.refresh();
    });
  }

  return (
    <form
      // dùng onSubmit (không dùng action) để form KHÔNG tự xóa khi đăng nhập sai
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget));
      }}
      className="space-y-3 rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-sm"
    >
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Email</span>
        <input name="email" type="email" required autoComplete="email" className={input} placeholder="ten@truong.edu.vn" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Mật khẩu</span>
        <input name="password" type="password" required autoComplete="current-password" className={input} />
      </label>
      {error && (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className={cn(btn.primary, "w-full")}>
        {pending ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>
    </form>
  );
}
