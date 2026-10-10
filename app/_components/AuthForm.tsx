"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { lookupStudent, registerStudent } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/browser";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

type Mode = "login" | "register";

const MODES: { value: Mode; label: string }[] = [
  { value: "login", label: "Đăng nhập" },
  { value: "register", label: "Tạo tài khoản" },
];

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    const classCode = String(formData.get("classCode") ?? "");
    const nickname = String(formData.get("nickname") ?? "");
    const fullName = String(formData.get("fullName") ?? "");
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");

    setError(null);
    if (mode === "register" && password !== confirm) {
      setError("Hai mật khẩu chưa giống nhau.");
      return;
    }

    startTransition(async () => {
      const result =
        mode === "login"
          ? await lookupStudent({ classCode, nickname })
          : await registerStudent({ classCode, nickname, fullName, password });
      if (!result.ok) {
        setError(result.error);
        return;
      }

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: result.email,
        password,
      });
      if (signInError) {
        setError(
          signInError.code === "user_banned"
            ? "Tài khoản này đang bị khóa. Hỏi thầy cô chủ nhiệm nhé."
            : signInError.status === 429
            ? "Bạn thử hơi nhiều lần rồi. Đợi một lát rồi thử lại nhé."
              : "Mã lớp, biệt danh hoặc mật khẩu chưa đúng.",
        );
        return;
      }
      router.replace(mode === "register" ? "/onboarding" : "/home");
      router.refresh();
    });
  }

  return (
    <div className="w-full rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-sm sm:p-6">
      <div role="tablist" className="mb-5 grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1">
        {MODES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => {
              setMode(value);
              setError(null);
            }}
            className={cn(
              "rounded-full py-2 text-sm font-semibold transition",
              mode === value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <form
        // dùng onSubmit (không dùng action) để form KHÔNG tự xóa khi đăng nhập sai
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(new FormData(e.currentTarget));
        }}
        className="space-y-3"
      >
        <Field
          label="Mã lớp"
          hint={mode === "register" ? "Thầy cô chủ nhiệm sẽ cho bạn mã này" : undefined}
        >
          <input
            name="classCode"
            required
            autoComplete="organization"
            autoCapitalize="characters"
            placeholder="VD: 8A1FBG"
            className={cn(input, "uppercase placeholder:normal-case")}
          />
        </Field>
        <Field
          label="Biệt danh"
          hint={
            mode === "register"
              ? "Tên gọi trong F-Mood. Các bạn trong lớp không thấy biệt danh của nhau."
              : undefined
          }
        >
          <input
            name="nickname"
            required
            autoComplete="username"
            placeholder="VD: Mèo Lười"
            className={input}
          />
        </Field>
        {mode === "register" && (
          <Field
            label="Họ và tên"
            hint="Chỉ thầy cô chủ nhiệm và phòng tham vấn thấy, để có thể giúp bạn kịp thời khi cần."
          >
            <input name="fullName" required autoComplete="name" placeholder="VD: Nguyễn Văn An" className={input} />
          </Field>
        )}
        <Field label="Mật khẩu">
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="Ít nhất 6 ký tự"
            className={input}
          />
        </Field>
        {mode === "register" && (
          <Field label="Nhập lại mật khẩu">
            <input
              name="confirm"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className={input}
            />
          </Field>
        )}

        {error && (
          <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        <button type="submit" disabled={pending} className={cn(btn.primary, "mt-2 w-full")}>
          {pending ? "Đang xử lý…" : mode === "login" ? "Vào F-Mood" : "Tạo tài khoản"}
        </button>

        {mode === "login" && (
          <p className="pt-1 text-center text-sm text-muted">
            Quên mật khẩu? Nhờ thầy cô chủ nhiệm đặt lại giúp bạn nhé.
          </p>
        )}
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
