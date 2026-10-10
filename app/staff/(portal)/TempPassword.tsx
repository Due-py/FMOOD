"use client";

import { useState } from "react";

/** Hiện mật khẩu tạm MỘT lần để thầy cô đưa cho người dùng. */
export function TempPassword({ password, who, onClose }: { password: string; who: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div role="status" className="mt-3 rounded-2xl border border-brand/40 bg-brand-soft p-4 text-sm">
      <p>
        Mật khẩu tạm của <strong>{who}</strong>:
      </p>
      <div className="mt-2 flex items-center gap-2">
        <code className="rounded-xl bg-surface px-3 py-2 font-mono text-lg font-bold tracking-wider">{password}</code>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(password);
              setCopied(true);
            } catch {}
          }}
          className="rounded-full bg-surface px-3 py-2 text-xs font-semibold hover:bg-surface-2"
        >
          {copied ? "Đã chép" : "Chép"}
        </button>
      </div>
      <p className="mt-2 text-muted">
        Mật khẩu chỉ hiện lần này. Nhắc người dùng đổi mật khẩu sau khi đăng nhập.
      </p>
      <button type="button" onClick={onClose} className="mt-2 text-xs font-semibold text-muted underline">
        Đóng
      </button>
    </div>
  );
}
