"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setClassTestOnly } from "@/app/actions/bai-do";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

/** Bật / tắt chế độ "chỉ làm bài đo" cho lớp so sánh (kế hoạch Demo 3, mục 6.2f). */
export function TestOnlyToggle({ classId, name, on }: { classId: string; name: string; on: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={pending}
        aria-pressed={on}
        className={cn(btn.secondary, on && "border-transparent bg-butter")}
        onClick={() => {
          const msg = on
            ? `Tắt chế độ "chỉ làm bài đo" cho ${name}? Học sinh lớp này sẽ dùng được mọi phần của app, kể cả trợ lý.`
            : `Bật chế độ "chỉ làm bài đo" cho ${name}? Học sinh lớp này chỉ thấy trang bài đo; mọi trang khác chuyển về đó và không dùng được trợ lý.`;
          if (confirm(msg)) {
            startTransition(async () => {
              const res = await setClassTestOnly(classId, !on);
              if (!res.ok) setError(res.error);
              else router.refresh();
            });
          }
        }}
      >
        {on ? "📝 Đang ở chế độ chỉ làm bài đo" : "Chế độ chỉ làm bài đo"}
      </button>
      <p className="mt-1 text-xs text-muted">Dùng cho lớp so sánh trong đợt đo: học sinh chỉ làm bài đo, không dùng các phần khác của app.</p>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
