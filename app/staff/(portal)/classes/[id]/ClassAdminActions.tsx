"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteClass, regenerateClassCode } from "@/app/actions/staff";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

export function ClassAdminActions({ classId, name, hasStudents }: { classId: string; name: string; hasStudents: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          className={btn.secondary}
          onClick={() => {
            if (confirm("Tạo mã lớp mới? Mã cũ sẽ không dùng để đăng ký được nữa (học sinh đã có tài khoản vẫn đăng nhập bằng mã mới).")) {
              startTransition(async () => {
                const res = await regenerateClassCode(classId);
                if (!res.ok) setError(res.error);
              });
            }
          }}
        >
          Tạo mã lớp mới
        </button>
        <button
          type="button"
          disabled={pending || hasStudents}
          title={hasStudents ? "Lớp còn học sinh nên chưa xóa được" : undefined}
          className={cn(btn.ghost, "text-danger hover:bg-danger-soft hover:text-danger")}
          onClick={() => {
            if (confirm(`Xóa lớp ${name}?`)) {
              startTransition(async () => {
                const res = await deleteClass(classId);
                if (!res.ok) setError(res.error);
                else router.replace("/staff/classes");
              });
            }
          }}
        >
          Xóa lớp
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
