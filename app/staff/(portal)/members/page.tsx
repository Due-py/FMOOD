import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { allStudents } from "@/lib/admin-data";
import { listClasses, listStaff } from "@/lib/staff";
import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/admin/AdminUI";
import { cn } from "@/components/ui/cn";
import { NewStaffForm, StaffList } from "../teachers/StaffManager";
import { StudentsAdmin } from "./StudentsAdmin";

export const metadata: Metadata = { title: "Thành viên" };

export default async function MembersPage({ searchParams }: PageProps<"/staff/members">) {
  const profile = await requireStaff(["admin"]);
  const { tab } = await searchParams;
  const showStudents = tab === "hoc-sinh";

  const [staff, students, classes] = await Promise.all([
    showStudents ? Promise.resolve([]) : listStaff(),
    showStudents ? allStudents() : Promise.resolve([]),
    showStudents ? listClasses(profile) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Lớp và người" title="Thành viên" />

      <nav aria-label="Loại thành viên" className="flex gap-2">
        {[
          { href: "/staff/members", label: "👩‍🏫 Thầy cô", active: !showStudents },
          { href: "/staff/members?tab=hoc-sinh", label: "🎒 Học sinh", active: showStudents },
        ].map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.active ? "page" : undefined}
            className={cn("rounded-full px-4 py-2 text-sm font-semibold", t.active ? "bg-ink text-bg" : "border border-line bg-surface text-muted hover:text-ink")}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {showStudents ? (
        <StudentsAdmin students={students} classes={classes.map((c) => ({ id: c.id, name: c.name }))} />
      ) : (
        <>
          <Section title="Thêm tài khoản thầy cô" description="Hệ thống tạo mật khẩu tạm để đưa cho thầy cô. Gán lớp chủ nhiệm ở trang Tình hình lớp.">
            <NewStaffForm />
          </Section>
          <StaffList staff={staff} selfId={profile.id} />
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-3xl bg-butter p-4">
              <dt className="font-semibold">Giáo viên chủ nhiệm</dt>
              <dd className="mt-1 text-muted">Cảnh báo, danh sách và thống kê ẩn danh của lớp mình. Đặt lại mật khẩu học sinh lớp mình.</dd>
            </div>
            <div className="rounded-3xl bg-sky p-4">
              <dt className="font-semibold">Phòng tham vấn</dt>
              <dd className="mt-1 text-muted">Cảnh báo, danh sách và thống kê ẩn danh của tất cả các lớp. Xem kết quả nghiên cứu.</dd>
            </div>
            <div className="rounded-3xl bg-lilac p-4">
              <dt className="font-semibold">Admin</dt>
              <dd className="mt-1 text-muted">Mọi quyền, cộng cài đặt Mây, nội dung, an toàn, khảo sát và tài khoản.</dd>
            </div>
          </dl>
        </>
      )}
    </div>
  );
}
