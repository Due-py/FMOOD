"use client";

import { useState, useTransition } from "react";
import { changePassword, deleteMyAccount } from "@/app/actions/account";
import { signOut } from "@/app/actions/auth";
import { clearAllDrafts } from "@/lib/drafts";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

export function ChangePasswordForm() {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const res = await changePassword({
            password: String(formData.get("password") ?? ""),
            confirm: String(formData.get("confirm") ?? ""),
          });
          setMessage(res.ok ? { ok: true, text: "Đã đổi mật khẩu." } : { ok: false, text: res.error });
        })
      }
      className="space-y-2"
    >
      <input name="password" type="password" required minLength={6} autoComplete="new-password" placeholder="Mật khẩu mới" className={input} aria-label="Mật khẩu mới" />
      <input name="confirm" type="password" required minLength={6} autoComplete="new-password" placeholder="Nhập lại mật khẩu mới" className={input} aria-label="Nhập lại mật khẩu mới" />
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

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={cn(btn.ghost, "-ml-4 text-danger hover:bg-danger-soft hover:text-danger")}>
        Xóa tài khoản và toàn bộ dữ liệu
      </button>
    );
  }

  return (
    <div className="rounded-3xl border border-danger/30 bg-danger-soft p-4">
      <p className="font-semibold">Bạn chắc chứ?</p>
      <p className="mt-1 text-sm">
        Toàn bộ check-in, trò chuyện và thói quen sẽ bị <strong>xóa vĩnh viễn</strong>, không khôi phục được.
        Những cảnh báo an toàn đã gửi tới thầy cô trước đó vẫn được giữ lại để thầy cô tiếp tục hỗ trợ.
      </p>
      <label className="mt-3 block text-sm">
        Gõ <strong>XOA</strong> để xác nhận
        <input value={text} onChange={(e) => setText(e.target.value)} className={cn(input, "mt-1")} autoComplete="off" />
      </label>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className={btn.secondary}>
          Hủy
        </button>
        <button
          type="button"
          disabled={pending || text.trim().toUpperCase() !== "XOA"}
          onClick={() =>
            startTransition(async () => {
              const res = await deleteMyAccount(text);
              if (res && !res.ok) setError(res.error);
            })
          }
          className={btn.danger}
        >
          {pending ? "Đang xóa…" : "Xóa vĩnh viễn"}
        </button>
      </div>
    </div>
  );
}

export function SignOutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() =>
        startTransition(() => {
          // máy dùng chung: không để lại nháp bài tập
          clearAllDrafts();
          return signOut();
        })
      } className={cn(btn.secondary, "w-full")}>
      {pending ? "Đang đăng xuất…" : "Đăng xuất"}
    </button>
  );
}
