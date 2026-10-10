import type { Metadata } from "next";
import { requireStaff, ROLE_LABEL } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { card } from "@/components/ui/styles";
import { StaffPasswordForm } from "./StaffPasswordForm";

export const metadata: Metadata = { title: "Tài khoản" };

export default async function StaffAccountPage() {
  const profile = await requireStaff();
  return (
    <div className="max-w-xl space-y-4">
      <PageHeader eyebrow={ROLE_LABEL[profile.role]} title="Tài khoản" />
      <section className={card}>
        <p className="font-semibold">{profile.nickname}</p>
        <p className="text-sm text-muted">{profile.email}</p>
      </section>
      <section className={card}>
        <h2 className="mb-3 font-display text-xl font-bold tracking-tight">Đổi mật khẩu</h2>
        <StaffPasswordForm />
      </section>
      <section className={card}>
        <h2 className="mb-3 font-display text-xl font-bold tracking-tight">Giao diện</h2>
        <ThemeToggle />
      </section>
      <a href="/signout?to=/staff/login" className="inline-block px-1 text-sm font-semibold text-muted hover:text-ink">
        Đăng xuất
      </a>
    </div>
  );
}
