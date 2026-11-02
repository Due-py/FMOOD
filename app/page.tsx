import Link from "next/link";
import { assistantInfo } from "@/lib/ai/chat-style";
import { defaultCharacter } from "@/lib/assistant";
import { AssistantProvider } from "@/components/mascot/AssistantContext";
import { MascotArt } from "@/components/mascot/MascotArt";
import { AuthForm } from "./_components/AuthForm";

// Trang đầu: chỉ có cửa vào cho học sinh và thầy cô. Phần giới thiệu nằm ở /gioi-thieu.
// Giao diện vui (mẫu dang-nhap.html, Duy duyệt 02/11): màn rộng chia đôi, bên trái nền mận có nhân vật mặc định (admin đặt)
// vẫy tay chào trong bong bóng lời và hai nhãn dán; bên phải là form. Điện thoại: dải chào gọn phía trên, form bên dưới.

export default async function LandingPage() {
  // chưa đăng nhập: nhân vật mặc định admin đặt (như trang thầy cô)
  const assistant = assistantInfo(await defaultCharacter());

  return (
    <AssistantProvider value={assistant}>
      <main className="relative grid min-h-dvh overflow-hidden lg:grid-cols-2">
        {/* ───────── lời chào ───────── */}
        <section
          aria-label="Lời chào"
          className="relative isolate flex flex-col overflow-hidden rounded-b-[2rem] bg-rail px-4 pb-6 pt-5 text-[var(--rail-ink)] lg:items-center lg:justify-center lg:rounded-none lg:px-10 lg:py-12"
        >
          <span aria-hidden className="pointer-events-none absolute -right-12 -top-16 -z-10 size-56 rounded-full bg-c1-mid/15" />
          <span aria-hidden className="pointer-events-none absolute -left-12 bottom-10 -z-10 size-40 rounded-full bg-c1-mid/15" />

          <div className="flex items-center gap-3 lg:absolute lg:left-8 lg:top-7">
            <span aria-hidden className="grid size-10 place-items-center rounded-full bg-cream text-[22px] lg:size-11">
              {assistant.emoji}
            </span>
            <span className="leading-none">
              <span className="block font-display text-[22px] font-extrabold text-brand lg:text-2xl">F-Mood</span>
              <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--rail-muted)]">Safe &amp; Sound</span>
            </span>
          </div>

          <div className="relative mt-3 flex w-full max-w-[440px] items-end gap-1 lg:mt-0 lg:block lg:text-center">
            <div className="order-2 mb-5 min-w-0 flex-1 rounded-[1.6rem] rounded-bl-md bg-surface px-4 py-3 text-left text-ink shadow-[0_12px_30px_rgb(0_0_0/0.18)] lg:mb-0 lg:inline-block lg:max-w-[380px] lg:px-6 lg:py-4">
              <p className="font-display text-[1.4rem] font-extrabold leading-tight lg:text-3xl">Chào bạn! 👋</p>
              <p className="mt-1 text-[13px] text-muted lg:text-[15px]">
                Mình là {assistant.name}. Dùng mã lớp thầy cô chủ nhiệm đưa cho bạn để vào F-Mood nhé.
              </p>
            </div>
            <MascotArt size={88} float className="order-1 lg:hidden" />
            <MascotArt size={196} float className="mx-auto mt-2 hidden lg:block" />
            <div aria-hidden className="mx-auto -mt-4 hidden h-6 w-60 rounded-[50%] bg-black/20 lg:block" />
            <span aria-hidden className="absolute -left-2 top-44 hidden -rotate-6 rounded-full bg-brand px-3.5 py-1.5 text-[13px] font-bold text-brand-ink shadow-[0_6px_16px_rgb(0_0_0/0.15)] lg:block">
              🔒 Riêng tư của bạn
            </span>
            <span aria-hidden className="absolute -right-2 top-64 hidden rotate-[5deg] rounded-full bg-c2 px-3.5 py-1.5 text-[13px] font-bold text-c2-ink shadow-[0_6px_16px_rgb(0_0_0/0.15)] lg:block">
              🌱 Safe &amp; Sound
            </span>
          </div>
        </section>

        {/* ───────── form ───────── */}
        <section className="relative isolate flex flex-col justify-center overflow-hidden px-4 pb-9 pt-5 sm:px-6 lg:px-12 lg:py-10">
          <span aria-hidden className="pointer-events-none absolute -right-24 -top-28 -z-10 size-80 rounded-full bg-c1 opacity-70" />
          <span aria-hidden className="pointer-events-none absolute -bottom-20 left-1/4 -z-10 size-60 rounded-full bg-c2 opacity-60" />
          <div className="fm-rise mx-auto w-full max-w-[460px]">
            <span className="inline-block -rotate-3 rounded-full bg-brand-soft px-3 py-0.5 text-xs font-extrabold text-brand-strong dark:text-brand">
              ✨ Bắt đầu
            </span>
            <h1 className="mt-2 font-display text-[1.9rem] font-extrabold leading-none tracking-tight lg:text-[2.4rem]">Vào F-Mood</h1>
            <p className="mb-4 mt-1.5 text-muted">Dùng mã lớp thầy cô chủ nhiệm đưa cho bạn.</p>

            <AuthForm />

            <p className="mt-4 flex items-start gap-2.5 rounded-[1.15rem] bg-sky px-3.5 py-2.5 text-[13px] text-muted">
              <span aria-hidden>💜</span>
              <span>
                F-Mood là công cụ hỗ trợ, <strong className="text-sky-ink">không phải chuyên gia tâm lý</strong>. Nhật ký và trò chuyện của
                bạn là riêng tư.
              </span>
            </p>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <DoorLink href="/staff/login" emoji="🧑‍🏫" tint="bg-c5">
                Đăng nhập thầy cô
              </DoorLink>
              <DoorLink href="/gioi-thieu" emoji={assistant.emoji} tint="bg-c1">
                Tìm hiểu F-Mood
              </DoorLink>
            </div>
            <p className="mt-5 text-center text-xs text-muted">
              <Link href="/quyen-rieng-tu" className="inline-flex min-h-11 items-center underline underline-offset-[3px] hover:text-ink">
                Quyền riêng tư
              </Link>
            </p>
          </div>
        </section>
      </main>
    </AssistantProvider>
  );
}

/** Lối sang trang khác: thẻ trắng nhỏ có ô biểu tượng màu và mũi tên. */
function DoorLink({ href, emoji, tint, children }: { href: string; emoji: string; tint: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex min-h-14 flex-[1_1_11rem] items-center gap-2.5 whitespace-nowrap rounded-[1.25rem] bg-surface px-3 py-2.5 text-sm font-bold shadow-soft transition duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:transform-none dark:border dark:border-line"
    >
      <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-xl text-[19px] ${tint}`}>
        {emoji}
      </span>
      {children}
      <span aria-hidden className="ml-auto text-muted">
        →
      </span>
    </Link>
  );
}
