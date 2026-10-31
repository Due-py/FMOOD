import Link from "next/link";
import { CharacterAvatar } from "@/components/mascot/CharacterAvatar";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { pill } from "@/components/ui/styles";
import { AuthForm } from "./_components/AuthForm";

// Trang đầu: chỉ có cửa vào cho học sinh và thầy cô. Phần giới thiệu nằm ở /gioi-thieu.

export default function LandingPage() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-cream px-4 py-10 sm:px-6">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-24 h-64 w-96 rounded-full bg-surface/60 blur-2xl" />
        <div className="absolute -right-16 bottom-10 h-72 w-[28rem] rounded-full bg-surface/60 blur-2xl" />
        <div className="absolute left-1/3 top-0 h-40 w-80 rounded-full bg-surface/50 blur-2xl" />
      </div>
      <div className="relative m-auto w-full max-w-md">
        <div className="fm-rise mb-6 text-center">
          <CharacterAvatar size={64} mood="happy" className="mx-auto block" />
          <span className={`${pill} mt-3`}>Bắt đầu</span>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-[-0.02em]">Vào F-Mood</h1>
          <p className="mt-2 text-muted">Dùng mã lớp thầy cô chủ nhiệm đưa cho bạn.</p>
        </div>
        <div className="fm-rise" style={{ animationDelay: "80ms" }}>
          <AuthForm />
        </div>
        <p className="mt-5 text-center text-xs leading-relaxed text-muted">
          F-Mood là công cụ hỗ trợ, <strong>không phải chuyên gia tâm lý</strong>. Nhật ký và trò chuyện của bạn là
          riêng tư.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          <ArrowLink href="/staff/login">Đăng nhập thầy cô</ArrowLink>
          <ArrowLink href="/gioi-thieu">Tìm hiểu F-Mood</ArrowLink>
        </div>
        <p className="mt-8 text-center text-xs text-muted">
          <Link href="/quyen-rieng-tu" className="underline-offset-2 hover:underline">
            Quyền riêng tư
          </Link>
        </p>
      </div>
    </main>
  );
}
