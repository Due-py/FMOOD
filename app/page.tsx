import Link from "next/link";
import { May } from "@/components/mascot/May";
import { ArcDivider } from "@/components/motion/ArcDivider";
import { CountUp } from "@/components/motion/CountUp";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { ScrollHighlight } from "@/components/motion/ScrollHighlight";
import { ArrowLink, RoundArrow } from "@/components/ui/ArrowLink";
import { BookIcon, ChatIcon, HabitIcon, PhoneIcon, UserIcon } from "@/components/ui/icons";
import { btn, card, cardHover, pill } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { AuthForm } from "./_components/AuthForm";
import { FloatingBubbles } from "./_components/FloatingBubbles";

// Trang đầu, bố cục theo mẫu Inspiration 1.

const NAV = [
  { href: "#tinh-nang", label: "F-Mood làm gì" },
  { href: "#vi-sao", label: "Vì sao" },
  { href: "#an-toan", label: "An toàn" },
  { href: "#bat-dau", label: "Bắt đầu" },
];

const FEATURES = [
  {
    Icon: UserIcon,
    title: "Check-in cảm xúc",
    text: "Chưa tới 1 phút để gọi tên cảm xúc bằng vài emoji. Xem lại lịch cảm xúc của chính mình.",
    tags: ["# Cảm xúc", "# Nhật ký"],
  },
  {
    Icon: ChatIcon,
    title: "Trò chuyện với Mây",
    text: "Một người bạn AI biết lắng nghe, không phán xét. Có gợi ý trả lời cho lúc khó mở lời.",
    tags: ["# Riêng tư", "# Lắng nghe"],
  },
  {
    Icon: HabitIcon,
    title: "Thói quen & khu vườn",
    text: "Đặt thói quen nhỏ, giữ chuỗi ngày và nuôi cây lớn dần. Lỡ đứt chuỗi thì bắt đầu lại.",
    tags: ["# Mục tiêu", "# Khu vườn"],
  },
  {
    Icon: BookIcon,
    title: "Thư viện well-being",
    text: "Gần 100 bài học ngắn cho lớp 6–8, mỗi bài có bài tập và nút “Mình cần giúp”.",
    tags: ["# Bài học", "# Luyện tập"],
  },
];

const STATS = [
  { value: 124, suffix: "", label: "học sinh khối 7–11 tham gia khảo sát của nhóm" },
  { value: 75, suffix: "%", label: "thấy áp lực vì học tập, thi cử" },
  { value: 60, suffix: "%", label: "chọn tự giải quyết một mình khi có ngày tồi tệ" },
  { value: 4, suffix: "%", label: "tìm đến thầy cô hoặc tư vấn viên" },
];

export default function LandingPage() {
  return (
    <div className="overflow-x-clip">
      {/* ───────── Thanh trên cùng ───────── */}
      <header className="sticky top-0 z-40 bg-bg-top/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <May size={34} float={false} />
            <span className="font-display text-lg font-extrabold tracking-tight">F-Mood</span>
          </Link>
          <nav aria-label="Trang đầu" className="hidden flex-1 justify-center md:flex">
            <ul className="flex gap-1">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a href={n.href} className="rounded-full px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted transition hover:text-ink">
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <Link href="/staff/login" aria-label="Đăng nhập thầy cô" title="Thầy cô" className={cn(btn.round, "size-11")}>
              <UserIcon size={18} />
            </Link>
            <a href="#bat-dau" className={btn.outline}>
              Vào F-Mood
            </a>
          </div>
        </div>
      </header>

      {/* ───────── Đầu trang: chữ khổng lồ, Mây nằm trong viên thuốc ───────── */}
      <section className="relative mx-auto max-w-6xl px-4 pb-10 pt-12 text-center sm:px-6 sm:pt-20">
        <div className="fm-rise">
          <span className={pill}>Save and Sound</span>
        </div>
        <div className="fm-rise" style={{ animationDelay: "80ms" }}>
          <h1 className="mx-auto mt-6 max-w-5xl font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-7xl lg:text-[5.6rem]">
            Cảm xúc{" "}
            <span className="relative mx-1 inline-flex h-[0.95em] w-[1.9em] translate-y-[0.12em] items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sky via-mint to-butter align-baseline">
              <May size={84} mood="happy" className="h-[0.85em] w-auto" />
            </span>{" "}
            được <span className="whitespace-nowrap">lắng nghe,</span>
            <br />
            bản thân được <span className="whitespace-nowrap text-brand-display">thấu hiểu.</span>
          </h1>
        </div>
        <div className="fm-rise" style={{ animationDelay: "160ms" }}>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
            Góc nhỏ riêng tư giúp học sinh ghi lại cảm xúc, hiểu mình đang cần gì, giữ thói quen tốt và tìm đến thầy cô
            khi cần.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a href="#bat-dau" className={btn.cta}>
              Bắt đầu ngay
            </a>
            <ArrowLink href="/staff/login">Tôi là thầy cô</ArrowLink>
          </div>
        </div>

        <div style={{ animationDelay: "240ms" }} className="fm-rise mt-16 flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t border-line pt-6 text-sm">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">The Crusaders · STEMpetition 2026–2027</span>
          <span className="hidden gap-6 font-display text-lg font-bold text-muted/80 sm:flex">
            <span>Check-in</span>
            <span>Mây AI</span>
            <span>Thói quen</span>
            <span>Thư viện</span>
          </span>
          <a href="#tinh-nang" className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted hover:text-ink">
            Cuộn xuống <span aria-hidden>↓</span>
          </a>
        </div>
      </section>

      {/* ───────── Tính năng ───────── */}
      <section id="tinh-nang" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6">
        <Reveal className="text-center">
          <span className={pill}>F-Mood làm gì</span>
          <h2 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-[-0.02em] sm:text-5xl">
            Một người bạn đồng hành, mỗi ngày một bước nhỏ
          </h2>
        </Reveal>
        <RevealGroup className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ Icon, title, text, tags }) => (
            <RevealItem key={title}>
              <a href="#bat-dau" className={cn(card, cardHover, "flex h-full flex-col p-6")}>
                <span className="flex size-10 items-center justify-center rounded-full bg-surface-2 transition group-hover:bg-surface">
                  <Icon size={18} />
                </span>
                <h3 className="mt-8 font-display text-xl font-bold tracking-tight">{title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{text}</p>
                <div className="mt-6 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-muted">{tags.join("  ")}</span>
                  <RoundArrow />
                </div>
              </a>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* ───────── Câu lớn sáng dần theo cuộn ───────── */}
      <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6">
        <ScrollHighlight
          className="text-3xl leading-snug sm:text-5xl sm:leading-tight"
          text="Nhiều bạn *không* *phải* *không* *cần* *giúp,* mà là *khó* *mở* *lời.* F-Mood giúp bạn hiểu mình hơn và bắt đầu từ *một* *bước* *nhỏ.*"
        />
      </section>

      {/* ───────── Con số ───────── */}
      <section id="vi-sao" className="relative scroll-mt-24">
        <div className="bg-gradient-to-b from-transparent to-cream px-4 pb-10 pt-16 text-center sm:px-6">
          <Reveal>
            <span className={pill}>Vì sao có F-Mood</span>
            <h2 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-[-0.02em] sm:text-5xl">
              Điều nhóm tìm thấy ở trường mình
            </h2>
          </Reveal>
          <div className="mx-auto mt-14 grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.08}>
                <CountUp value={s.value} suffix={s.suffix} className="font-display text-6xl font-extrabold tracking-[-0.03em] text-brand-display sm:text-7xl" />
                <p className="mx-auto mt-3 max-w-[16rem] text-sm font-semibold">{s.label}</p>
              </Reveal>
            ))}
          </div>
          <p className="mt-10 text-xs text-muted">Khảo sát nội bộ 124 học sinh khối 7–11, Trường TH, THCS và THPT FPT Bắc Giang, 29/09/2026.</p>
        </div>
        <ArcDivider className="-mt-px text-cream" flip />
      </section>

      {/* ───────── An toàn ───────── */}
      <section id="an-toan" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <span className={pill}>Riêng tư & an toàn</span>
            <h2 className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-[-0.02em] sm:text-5xl">
              Chuyện của bạn là của bạn
            </h2>
            <p className="mt-4 text-lg text-muted">
              Thầy cô không đọc được nhật ký, trò chuyện hay bài tập của bạn. Chỉ khi có dấu hiệu nguy hiểm, thầy cô phụ
              trách mới được báo để kịp giúp, và F-Mood luôn nói rõ cho bạn biết.
            </p>
          </Reveal>
          <RevealGroup className="grid gap-3">
            {[
              { e: "🔒", t: "Riêng tư", d: "Bạn bè không thấy biệt danh của nhau. Có thể xóa dữ liệu bất cứ lúc nào." },
              { e: "🛟", t: "Kết nối người thật", d: "Dấu hiệu nguy hiểm được báo tới thầy cô phụ trách, kèm số 111 và 115." },
              { e: "🤝", t: "Không thay thế chuyên gia", d: "Mây là công cụ hỗ trợ, không chẩn đoán và không thay thế thầy cô, bố mẹ." },
            ].map((x) => (
              <RevealItem key={x.t}>
                <div className={cn(card, cardHover, "flex items-start gap-4")}>
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xl transition group-hover:bg-surface" aria-hidden>
                    {x.e}
                  </span>
                  <div>
                    <p className="font-display text-lg font-bold tracking-tight">{x.t}</p>
                    <p className="text-sm text-muted">{x.d}</p>
                  </div>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ───────── Đăng nhập: thẻ trắng trên nền kem có mây mờ ───────── */}
      <section id="bat-dau" className="relative scroll-mt-20 overflow-hidden bg-cream px-4 py-24 sm:px-6">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-24 h-64 w-96 rounded-full bg-surface/60 blur-2xl" />
          <div className="absolute -right-16 bottom-10 h-72 w-[28rem] rounded-full bg-surface/60 blur-2xl" />
          <div className="absolute left-1/3 top-0 h-40 w-80 rounded-full bg-surface/50 blur-2xl" />
        </div>
        <div className="relative mx-auto max-w-md">
          <Reveal className="mb-6 text-center">
            <span className={pill}>Bắt đầu</span>
            <h2 className="mt-3 font-display text-4xl font-extrabold tracking-[-0.02em]">Vào F-Mood</h2>
            <p className="mt-2 text-muted">Dùng mã lớp thầy cô chủ nhiệm đưa cho bạn.</p>
          </Reveal>
          <Reveal delay={0.1}>
            <AuthForm />
          </Reveal>
          <p className="mt-5 text-center text-xs leading-relaxed text-muted">
            F-Mood là công cụ hỗ trợ, <strong>không phải chuyên gia tâm lý</strong>. Nhật ký và trò chuyện của bạn là
            riêng tư.
          </p>
          <div className="mt-4 flex justify-center">
            <ArrowLink href="/staff/login">Đăng nhập thầy cô</ArrowLink>
          </div>
        </div>
      </section>

      {/* ───────── Kêu gọi: vòng tròn Mây lơ lửng ───────── */}
      <section className="relative mx-auto max-w-6xl px-4 py-28 text-center sm:px-6">
        <FloatingBubbles />
        <Reveal className="relative">
          <span className={pill}>Cùng nhau</span>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-4xl font-extrabold leading-tight tracking-[-0.02em] sm:text-6xl">
            Hôm nay bạn thấy thế nào?
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a href="#bat-dau" className={btn.cta}>
              Check-in ngay
            </a>
            <ArrowLink href="#tinh-nang">Xem tính năng</ArrowLink>
          </div>
        </Reveal>
      </section>

      {/* ───────── Chân trang ───────── */}
      <footer className="bg-gradient-to-b from-transparent to-cream">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-10 pt-16 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <May size={44} float={false} />
              <span className="font-display text-2xl font-extrabold tracking-tight">F-Mood</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted">Cảm xúc được lắng nghe, bản thân được thấu hiểu.</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted">Đường dẫn nhanh</p>
            <ul className="mt-3 space-y-2 text-[11px] font-extrabold uppercase tracking-[0.14em]">
              <li><a href="#bat-dau" className="hover:text-brand-strong">Vào F-Mood</a></li>
              <li><Link href="/staff/login" className="hover:text-brand-strong">Thầy cô</Link></li>
              <li><a href="#an-toan" className="hover:text-brand-strong">Riêng tư & an toàn</a></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted">Khi cần giúp ngay</p>
            <ul className="mt-3 space-y-2">
              {[
                ["111", "Tổng đài Bảo vệ trẻ em"],
                ["115", "Cấp cứu"],
              ].map(([n, t]) => (
                <li key={n}>
                  <a href={`tel:${n}`} className="group/arrow inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em]">
                    <span className="flex size-8 items-center justify-center rounded-full border border-line bg-surface transition group-hover/arrow:bg-brand">
                      <PhoneIcon size={14} />
                    </span>
                    {n} · {t}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-6 text-xs text-muted sm:px-6">
          <span>© 2026 The Crusaders · Trường TH, THCS và THPT FPT Bắc Giang</span>
          <a href="#" className="group/arrow inline-flex items-center gap-2 font-extrabold uppercase tracking-[0.14em] text-ink">
            Lên đầu trang
            <span className="flex size-8 items-center justify-center rounded-full border border-line bg-surface transition group-hover/arrow:-translate-y-0.5">↑</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
