"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { lookupStudent, registerStudent } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/browser";
import { markPrivacyPromise } from "@/components/PrivacyPromise";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { setRememberChoice, writeSavedLogin } from "@/lib/remember";
import { RememberCheckbox, useSavedLogin } from "./RememberCheckbox";

type Mode = "login" | "register";

/** ô nhập của trang đăng nhập học sinh (giao diện vui, mẫu dang-nhap.html): nền kem, viền 2px, bấm vào thì viền tím nhạt */
const input = "block w-full rounded-[1.15rem] border-2 border-line bg-surface-2/50 px-3.5 py-3 text-base text-ink placeholder:text-muted outline-none transition focus:border-c1-mid focus:bg-surface focus:ring-4 focus:ring-c1/60";

const MODES: { value: Mode; label: string }[] = [
  { value: "login", label: "Đăng nhập" },
  { value: "register", label: "Tạo tài khoản" },
];

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // đăng nhập xong, đang mở trang mới: vẫn khóa nút cho tới khi chuyển trang xong
  const [entering, setEntering] = useState(false);
  const busy = pending || entering;
  // điền sẵn mã lớp + biệt danh nếu lần trước đã tick "Nhớ tài khoản"
  const stored = useSavedLogin();
  const saved = stored?.classCode && stored.nickname ? stored : null;
  const [rememberChoice, setRemember] = useState<boolean | null>(null);
  const remember = rememberChoice ?? Boolean(saved);

  function onSubmit(formData: FormData) {
    const classCode = String(formData.get("classCode") ?? "");
    const nickname = String(formData.get("nickname") ?? "");
    const fullName = String(formData.get("fullName") ?? "");
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");

    if (busy) return;
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

      setRememberChoice(remember);
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
      writeSavedLogin(remember ? { classCode: classCode.trim().toUpperCase(), nickname: nickname.trim() } : null);
      // bảng cam kết riêng tư hiện ở trang đầu tiên sau khi vào (components/PrivacyPromise.tsx)
      markPrivacyPromise();
      setEntering(true);
      router.replace(mode === "register" ? "/onboarding" : "/home");
      router.refresh();
    });
  }

  return (
    <div className="w-full rounded-[1.75rem] bg-surface p-4 shadow-soft sm:p-5 dark:border dark:border-line">
      <div role="tablist" className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1">
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
              "min-h-11 rounded-full py-2 text-sm font-bold transition",
              mode === value ? "bg-surface text-ink shadow-[0_2px_8px_rgb(61_52_80/0.1)]" : "text-muted hover:text-ink",
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
          key={`code-${saved?.classCode ?? ""}`}
          label="Mã lớp"
          emoji="🏫"
          tint="bg-c5"
          hint={mode === "register" ? "Thầy cô chủ nhiệm sẽ cho bạn mã này" : undefined}
        >
          <input
            name="classCode"
            defaultValue={saved?.classCode}
            required
            autoComplete="organization"
            autoCapitalize="characters"
            placeholder="VD: 8A1FBG"
            className={cn(input, "font-bold uppercase tracking-[0.08em] placeholder:font-normal placeholder:normal-case placeholder:tracking-normal")}
          />
        </Field>
        <Field
          key={`nick-${saved?.nickname ?? ""}`}
          label="Biệt danh"
          emoji="🐾"
          tint="bg-c1"
          hint={
            mode === "register"
              ? "Tên gọi trong F-Mood. Các bạn trong lớp không thấy biệt danh của nhau."
              : undefined
          }
        >
          <input
            name="nickname"
            defaultValue={saved?.nickname}
            required
            autoComplete="username"
            placeholder="VD: Mèo Lười"
            className={input}
          />
        </Field>
        {mode === "register" && (
          <Field
            label="Họ và tên"
            emoji="🪪"
            tint="bg-c3"
            hint="Chỉ thầy cô chủ nhiệm và phòng tham vấn thấy, để có thể giúp bạn kịp thời khi cần."
          >
            <input name="fullName" required autoComplete="name" placeholder="VD: Nguyễn Văn An" className={input} />
          </Field>
        )}
        <Field label="Mật khẩu" emoji="🔑" tint="bg-c2">
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
          <Field label="Nhập lại mật khẩu" emoji="🔁" tint="bg-c2">
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

        <div className="rounded-[1.15rem] bg-surface-2/70 px-2 py-1.5">
          <RememberCheckbox checked={remember} onChange={setRemember} />
        </div>

        {error && (
          <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} aria-busy={busy} className={cn(btn.primary, "mt-2 w-full text-[17px]")}>
          {entering ? "Đang vào F-Mood…" : pending ? "Đang xử lý…" : mode === "login" ? "Vào F-Mood →" : "Tạo tài khoản ✨"}
        </button>

        {mode === "login" && (
          <p className="pt-1 text-center text-[13px] text-muted">
            <span aria-hidden>🤔</span> Quên mật khẩu? Nhờ thầy cô chủ nhiệm đặt lại giúp bạn nhé.
          </p>
        )}
      </form>
    </div>
  );
}

function Field({
  label,
  emoji,
  tint,
  hint,
  children,
}: {
  label: string;
  /** biểu tượng nhỏ trong ô màu cạnh nhãn (trang trí) */
  emoji: string;
  tint: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2 text-sm font-bold">
        <span aria-hidden className={cn("grid size-[1.625rem] place-items-center rounded-[0.55rem] text-sm", tint)}>
          {emoji}
        </span>
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
