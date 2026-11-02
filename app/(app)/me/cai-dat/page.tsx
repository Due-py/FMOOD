import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ChangePasswordForm, DeleteAccount } from "../AccountSettings";
import { BackToMe, MeBox, MeSubHeader } from "../MeBox";

export const metadata: Metadata = { title: "Cài đặt tài khoản" };

/**
 * Cài đặt tài khoản: giao diện, đổi mật khẩu, quyền riêng tư và xóa tài khoản. Nút Đăng xuất ở cuối trang Tôi.
 * Giao diện vui (mẫu toi.html, thẻ Cài đặt): mỗi mục một hộp trắng có ô biểu tượng màu; xóa tài khoản để riêng, nền đỏ nhạt.
 */
export default async function AccountSettingsPage() {
  await requireProfile();
  return (
    <div className="fm-stagger mx-auto max-w-2xl space-y-4">
      <div>
        <BackToMe />
        <MeSubHeader emoji="⚙️" tint="bg-brand-soft" title="Cài đặt" lead="Tài khoản của bạn" />
      </div>

      <MeBox id="giao-dien" icon="🌗" tint="bg-brand-soft" title="Giao diện" sub="Sáng, tối hoặc theo máy của bạn.">
        <div className="mt-4">
          <ThemeToggle />
        </div>
      </MeBox>

      <MeBox id="doi-mat-khau" icon="🔑" tint="bg-c5" title="Đổi mật khẩu" sub="Mật khẩu mới, ít nhất 6 ký tự.">
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
      </MeBox>

      <MeBox id="rieng-tu" icon="🔒" tint="bg-c1" title="Quyền riêng tư">
        <p className="mt-3 text-sm text-muted">
          Thầy cô không đọc được check-in, trò chuyện hay thói quen của bạn. Chỉ khi có dấu hiệu nguy hiểm, thầy cô phụ trách
          mới nhận được đoạn đáng lo đó. F-Mood là công cụ hỗ trợ, không phải chuyên gia tâm lý.{" "}
          <Link href="/quyen-rieng-tu" className="font-semibold text-ink underline underline-offset-4">
            Đọc đầy đủ
          </Link>
        </p>
      </MeBox>

      <MeBox
        id="xoa-tai-khoan"
        icon="🗑️"
        tint="bg-danger-soft"
        title={<span className="text-danger">Xóa tài khoản</span>}
        sub="Cần gõ XOA để xác nhận. Không khôi phục được."
      >
        <div className="mt-3">
          <DeleteAccount />
        </div>
      </MeBox>
    </div>
  );
}
