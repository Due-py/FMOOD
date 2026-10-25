"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registerStaff } from "@/app/actions/auth";
import { RememberCheckbox, useSavedLogin } from "@/app/_components/RememberCheckbox";
import { createClient } from "@/lib/supabase/browser";
import { setRememberChoice, writeSavedLogin } from "@/lib/remember";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

type Mode = "login" | "register";

const MODES: { value: Mode; label: string }[] = [
  { value: "login", label: "Đăng nhập" },
  { value: "register", label: "Tạo tài khoản" },
];

export function StaffLoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // đăng nhập xong, đang mở trang mới: vẫn khóa nút cho tới khi chuyển trang xong
  const [entering, setEntering] = useState(false);
  const busy = pending || entering;
  // điền sẵn email nếu lần trước đã tick "Nhớ tài khoản"
  const savedEmail = useSavedLogin()?.email ?? null;
  const [rememberChoice, setRemember] = useState<boolean | null>(null);
  const remember = rememberChoice ?? Boolean(savedEmail);

  function onSubmit(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    if (busy) return;
    setError(null);
    if (mode === "register" && password !== String(formData.get("confirm") ?? "")) {
      setError("Hai mật khẩu chưa giống nhau.");
      return;
    }

    startTransition(async () => {
      if (mode === "register") {
        const res = await registerStaff({
          code: String(formData.get("code") ?? ""),
          name: String(formData.get("name") ?? ""),
          email,
          password,
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
      }

      setRememberChoice(remember);
      const { error } = await createClient().auth.signInWithPassword({ email, password });
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
      writeSavedLogin(remember ? { email } : null);
      // trang /staff tự kiểm tra vai trò (học sinh sẽ được đưa về trang của mình)
      setEntering(true);
      router.replace("/staff");
      router.refresh();
    });
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-sm">
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
        {mode === "register" && (
          <>
            <Field label="Mã đăng ký của trường" hint="Admin hoặc ban tổ chức sẽ cho thầy cô mã này.">
              <input
                name="code"
                required
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className={cn(input, "font-mono uppercase tracking-wider")}
              />
            </Field>
            <Field label="Họ và tên">
              <input name="name" required autoComplete="name" placeholder="VD: Nguyễn Thị Thúy" className={input} />
            </Field>
          </>
        )}
        <Field label="Email">
          <input
            key={savedEmail ?? ""}
            name="email"
            type="email"
            required
            defaultValue={mode === "login" ? (savedEmail ?? undefined) : undefined}
            autoComplete="email"
            className={input}
            placeholder="ten@truong.edu.vn"
          />
        </Field>
        <Field label="Mật khẩu">
          <input
            name="password"
            type="password"
            required
            minLength={mode === "register" ? 8 : undefined}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder={mode === "register" ? "Ít nhất 8 ký tự" : undefined}
            className={input}
          />
        </Field>
        {mode === "register" && (
          <Field label="Nhập lại mật khẩu">
            <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={input} />
          </Field>
        )}

        <RememberCheckbox checked={remember} onChange={setRemember} />

        {error && (
          <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} aria-busy={busy} className={cn(btn.primary, "w-full")}>
          {entering ? "Đang vào…" : pending ? "Đang xử lý…" : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
        </button>
        {mode === "register" && (
          <p className="text-center text-xs text-muted">
            Tài khoản mới là giáo viên và chưa phụ trách lớp nào. Admin sẽ gán lớp chủ nhiệm cho thầy cô.
          </p>
        )}
      </form>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
