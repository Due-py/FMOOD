import type { Metadata } from "next";
import Link from "next/link";
import { requirePage } from "@/lib/permissions";
import { listClasses, listStaff } from "@/lib/staff";
import { PageHeader } from "@/components/PageHeader";
import { ArrowUpRight } from "@/components/ui/icons";
import { card } from "@/components/ui/styles";
import { ClassForm } from "./ClassForm";

export const metadata: Metadata = { title: "Tình hình lớp" };

export default async function ClassesPage() {
  const profile = await requirePage("/staff/classes");
  const isAdmin = profile.role === "admin";
  const [classes, staff] = await Promise.all([listClasses(profile), isAdmin ? listStaff() : Promise.resolve([])]);
  const teachers = staff.filter((s) => s.role === "teacher" && !s.locked_at).map((s) => ({ id: s.id, name: s.name }));

  return (
    <>
      <PageHeader eyebrow={profile.role === "teacher" ? "Lớp thầy cô chủ nhiệm" : "Tất cả các lớp"} title="Tình hình lớp" />

      {classes.length === 0 ? (
        <p className="rounded-3xl bg-surface-2 p-6 text-center text-muted">
          {profile.role === "teacher" ? "Thầy cô chưa được gán lớp chủ nhiệm nào." : "Chưa có lớp nào."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="px-5 py-3 font-medium">Lớp</th>
                <th className="px-3 py-3 font-medium">Mã lớp</th>
                <th className="px-3 py-3 font-medium">GVCN</th>
                <th className="px-3 py-3 text-right font-medium">Học sinh</th>
                <th className="px-3 py-3 text-right font-medium">Cảnh báo</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0 hover:bg-surface-2">
                  <td className="px-5 py-3">
                    <Link href={`/staff/classes/${c.id}`} className="font-semibold hover:underline">
                      {c.name}
                    </Link>
                    {c.grade && <span className="ml-2 text-xs text-muted">Khối {c.grade}</span>}
                  </td>
                  <td className="px-3 py-3 font-mono font-bold tracking-wider">{c.code}</td>
                  <td className="px-3 py-3">{c.homeroom?.name ?? <span className="text-muted">Chưa gán</span>}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{c.studentCount}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {c.openAlerts > 0 ? (
                      <span className="rounded-full bg-danger-soft px-2 py-0.5 font-bold text-danger">{c.openAlerts}</span>
                    ) : (
                      <span className="text-muted">0</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/staff/classes/${c.id}`} aria-label={`Mở lớp ${c.name}`} className="inline-flex text-muted hover:text-ink">
                      <ArrowUpRight size={18} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAdmin && (
        <section className={`${card} mt-8`}>
          <h2 className="mb-1 font-display text-xl font-bold tracking-tight">Tạo lớp mới</h2>
          <p className="mb-4 text-sm text-muted">Mã lớp được tạo tự động để đưa cho học sinh đăng ký.</p>
          <ClassForm teachers={teachers} />
        </section>
      )}
    </>
  );
}
