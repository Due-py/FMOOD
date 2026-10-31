import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft } from "@/components/ui/icons";
import { btn, card } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { ChangePasswordForm, DeleteAccount } from "../AccountSettings";

export const metadata: Metadata = { title: "Cài đặt tài khoản" };

/** Cài đặt tài khoản: giao diện, đổi mật khẩu, quyền riêng tư và xóa tài khoản. Nút Đăng xuất ở cuối trang Tôi. */
export default async function AccountSettingsPage() {
  await requireProfile();
  return (
    <div className="space-y-4">
      <Link href="/me" className={cn(btn.ghost, "-ml-3")}>
        <ArrowLeft size={18} /> Tôi
      </Link>
      <PageHeader eyebrow="Tài khoản của bạn" title="Cài đặt" />

      <section className={card}>
        <h2 className="mb-3 font-display text-xl font-bold tracking-tight">Giao diện</h2>
        <ThemeToggle />
      </section>

      <section className={card}>
        <h2 className="mb-3 font-display text-xl font-bold tracking-tight">Đổi mật khẩu</h2>
        <ChangePasswordForm />
      </section>

      <section className={card}>
        <h2 className="mb-1 font-display text-xl font-bold tracking-tight">Quyền riêng tư</h2>
        <p className="mb-2 text-sm text-muted">
          Thầy cô không đọc được check-in, trò chuyện hay thói quen của bạn. Chỉ khi có dấu hiệu nguy hiểm, thầy cô phụ trách
          mới nhận được đoạn đáng lo đó. F-Mood là công cụ hỗ trợ, không phải chuyên gia tâm lý.{" "}
          <Link href="/quyen-rieng-tu" className="font-semibold text-ink underline underline-offset-4">
            Đọc đầy đủ
          </Link>
        </p>
        <DeleteAccount />
      </section>
    </div>
  );
}
