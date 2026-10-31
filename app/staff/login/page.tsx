import type { Metadata } from "next";
import Link from "next/link";
import { CharacterAvatar } from "@/components/mascot/CharacterAvatar";
import { pill } from "@/components/ui/styles";
import { StaffLoginForm } from "./StaffLoginForm";

export const metadata: Metadata = { title: "Đăng nhập thầy cô" };

export default function StaffLoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <CharacterAvatar size={56} float={false} mood="calm" />
        <div>
          <span className={pill}>Dành cho thầy cô</span>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">F-Mood quản lý</h1>
        </div>
      </div>
      <StaffLoginForm />
      <p className="mt-6 text-center text-sm text-muted">
        Quên mật khẩu? Liên hệ admin của trường để được đặt lại.
        <br />
        Bạn là học sinh?{" "}
        <Link href="/" className="font-semibold text-brand-strong underline-offset-2 hover:underline dark:text-brand">
          Vào trang học sinh
        </Link>
      </p>
    </main>
  );
}
