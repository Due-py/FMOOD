"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteClass, regenerateClassCode, setClassTest } from "@/app/actions/staff";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

export function ClassAdminActions({
  classId,
  name,
  hasStudents,
  isTest,
}: {
  classId: string;
  name: string;
  hasStudents: boolean;
  /** lớp thử: thấy cả nội dung vòng hỗ trợ ở trạng thái "Chỉ lớp thử" */
  isTest: boolean;
}) {
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
          disabled={pending}
          aria-pressed={isTest}
          className={cn(btn.secondary, isTest && "border-transparent bg-butter")}
          onClick={() => {
            const msg = isTest
              ? `Bỏ đánh dấu lớp thử cho ${name}? Học sinh lớp này sẽ chỉ thấy nội dung đã bật cho mọi lớp.`
              : `Đánh dấu ${name} là lớp thử? Học sinh lớp này sẽ thấy cả nội dung vòng hỗ trợ đang ở trạng thái "Chỉ lớp thử". Không dùng cho lớp thật.`;
            if (confirm(msg)) {
              startTransition(async () => {
                const res = await setClassTest(classId, !isTest);
                if (!res.ok) setError(res.error);
                else router.refresh();
              });
            }
          }}
        >
          {isTest ? "🧪 Đang là lớp thử" : "Đánh dấu lớp thử"}
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
