import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { currentAssistant } from "@/lib/assistant";
import { CharacterAvatar } from "@/components/mascot/CharacterAvatar";
import { NewPasswordForm } from "./NewPasswordForm";

export const metadata: Metadata = { title: "Đặt mật khẩu mới" };

/** Sau khi thầy cô đặt mật khẩu tạm: học sinh phải đặt mật khẩu của riêng mình trước khi vào app. */
export default async function NewPasswordPage() {
  const profile = await requireProfile({ allowPasswordChange: true });
  if (!profile.must_change_password) redirect("/home");
  const assistant = await currentAssistant();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-8 sm:px-6">
      <CharacterAvatar size={88} mood="calm" character={assistant.key} />
      <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight">Đặt mật khẩu mới</h1>
      <p className="mt-2 text-muted">
        Chào {profile.nickname}! Thầy cô vừa đặt lại mật khẩu cho tài khoản của bạn. Hãy chọn một mật khẩu
        mới <strong className="text-ink">chỉ mình bạn biết</strong>. Mật khẩu tạm sẽ không dùng được nữa.
      </p>
      <NewPasswordForm />
      <p className="mt-4 text-sm text-muted">
        Nếu bạn <strong>không</strong> nhờ thầy cô đặt lại mật khẩu, hãy báo phòng tham vấn hoặc thầy cô chủ nhiệm.
      </p>
      <a href="/signout" className="mt-6 text-sm font-semibold text-muted underline underline-offset-4 hover:text-ink">
        Đăng xuất
      </a>
    </main>
  );
}
