"use client";

import { useRef, useState, useTransition } from "react";
import { saveClass } from "@/app/actions/staff";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

type Values = { name: string; grade: string; negative_streak_days: string; homeroom_teacher_id: string };

/** Admin tạo lớp mới hoặc sửa lớp. */
export function ClassForm({
  classId = null,
  initial,
  teachers,
  onDone,
}: {
  classId?: string | null;
  initial?: Partial<Values>;
  teachers: { id: string; name: string }[];
  onDone?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(fd) =>
        startTransition(async () => {
          setError(null);
          setSaved(false);
          const res = await saveClass(classId, {
            name: String(fd.get("name") ?? ""),
            grade: String(fd.get("grade") ?? ""),
            negative_streak_days: String(fd.get("negative_streak_days") ?? "5"),
            homeroom_teacher_id: String(fd.get("homeroom_teacher_id") ?? ""),
          });
          if (!res.ok) setError(res.error);
          else {
            setSaved(true);
            if (!classId) formRef.current?.reset();
            onDone?.();
          }
        })
      }
      className="grid gap-3 sm:grid-cols-2"
    >
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Tên lớp</span>
        <input name="name" required maxLength={40} defaultValue={initial?.name} placeholder="VD: 8A1" className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Khối</span>
        <select name="grade" defaultValue={initial?.grade ?? ""} className={input}>
          <option value="">Không ghi</option>
          {[6, 7, 8, 9, 10, 11, 12].map((g) => (
            <option key={g} value={g}>
              Khối {g}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Giáo viên chủ nhiệm</span>
        <select name="homeroom_teacher_id" defaultValue={initial?.homeroom_teacher_id ?? ""} className={input}>
          <option value="">Chưa gán</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Báo khi nặng lòng liên tiếp</span>
        <span className="flex items-center gap-2">
          <input
            name="negative_streak_days"
            type="number"
            min={2}
            max={30}
            defaultValue={initial?.negative_streak_days ?? "5"}
            className={cn(input, "w-24")}
          />
          <span className="text-sm text-muted">ngày</span>
        </span>
      </label>
      {error && <p role="alert" className="text-sm text-danger sm:col-span-2">{error}</p>}
      {saved && !error && <p role="status" className="text-sm text-brand-strong dark:text-brand sm:col-span-2">Đã lưu.</p>}
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className={btn.primary}>
          {pending ? "Đang lưu…" : classId ? "Lưu thay đổi" : "Tạo lớp"}
        </button>
      </div>
    </form>
  );
}
