"use client";

import { useState } from "react";
import { importLessonFiles } from "@/app/actions/admin";
import { StatusText, useAction } from "@/components/admin/AdminUI";
import { btn } from "@/components/ui/styles";

/** Nhập bài từ thư mục content/lessons (bài mẫu và bài chia từ sách Oxford). */
export function ImportLessonsButton({ subtle = false }: { subtle?: boolean }) {
  const { pending, status, run } = useAction();
  const [errors, setErrors] = useState<string[]>([]);
  const go = (overwrite: boolean) =>
    run(
      () => importLessonFiles(overwrite),
      overwrite ? "Đã cập nhật nội dung từ file." : "Đã nhập bài (bài đã có thì giữ nguyên).",
      (res) => setErrors("errors" in res ? res.errors : []),
    );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={pending} onClick={() => go(false)} className={subtle ? "font-semibold underline-offset-2 hover:underline" : btn.secondary}>
          {pending ? "Đang nhập…" : "Nhập bài từ thư mục dự án"}
        </button>
        {subtle && (
          <button
            type="button"
            disabled={pending}
            onClick={() => confirm("Ghi đè nội dung các bài đã có bằng nội dung trong file? Chỉnh sửa trên web của các bài đó sẽ mất.") && go(true)}
            className="font-semibold text-danger underline-offset-2 hover:underline"
          >
            Cập nhật lại từ file (ghi đè)
          </button>
        )}
        <StatusText status={status} />
      </div>
      {errors.length > 0 && (
        <ul className="rounded-2xl bg-danger-soft p-3 text-xs text-danger">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
