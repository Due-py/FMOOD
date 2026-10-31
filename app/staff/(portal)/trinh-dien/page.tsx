import type { Metadata } from "next";
import Link from "next/link";
import { requirePage } from "@/lib/permissions";
import { demoOn, demoOverview } from "@/lib/demo/server";
import { DEMO_CONTROL_CLASS } from "@/lib/demo/generate";
import { DEMO_SECTIONS, totalMinutes } from "@/lib/demo/sections";
import { CharacterAvatar } from "@/components/mascot/CharacterAvatar";
import { DemoToggle } from "@/components/staff/DemoBanner";
import { cn } from "@/components/ui/cn";
import { DemoDataPanel } from "./DemoDataPanel";
import { SpeakerNotes } from "./DemoChrome";

export const metadata: Metadata = { title: "Trình diễn" };
// tạo / xóa dữ liệu mẫu cần nhiều lượt gọi máy chủ
export const maxDuration = 60;

const TONES = ["bg-mint", "bg-sky", "bg-peach", "bg-lilac", "bg-butter", "bg-mint", "bg-sky"];

function when(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "numeric", month: "numeric" }).format(new Date(iso));
}

export default async function DemoHubPage() {
  await requirePage("/staff/trinh-dien");
  const [demo, overview] = await Promise.all([demoOn(), demoOverview()]);

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end gap-5">
        <CharacterAvatar size={92} mood="happy" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-muted">Chế độ trình diễn · chỉ admin thấy trang này</p>
          <h1 className="mt-1 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">Nhìn vào bên trong trợ lý AI</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Cho ban giám khảo thấy trợ lý hiểu tin nhắn, nhận ra nguy hiểm, được dạy, giữ bí mật và chăm sóc một bạn ra sao, bằng chính code đang chạy,
            trên dữ liệu mẫu.
          </p>
        </div>
        <DemoToggle on={demo} />
      </header>

      <section aria-labelledby="data-title" className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <h2 id="data-title" className="font-display text-2xl font-bold tracking-tight">
            Dữ liệu mẫu
          </h2>
          {overview ? (
            <>
              <p className="mt-1 text-sm text-muted">
                Tạo lúc {when(overview.createdAt)} bởi {overview.createdBy}. Giống như các lớp đã dùng app khoảng 1 tháng.
                {overview.status !== "ready" && " (Đang tạo dở: bấm Tạo lại.)"}
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {overview.classes.map((c) => (
                  <li key={c.id} className="rounded-2xl bg-mint/70 px-4 py-3">
                    <p className="font-display text-lg font-bold">{c.name}</p>
                    <p className="text-sm">
                      {c.students} bạn · GVCN {c.teacher ?? "chưa có"}
                    </p>
                    <p className="text-xs text-muted">Mã lớp {c.code} (không ai đăng nhập được)</p>
                  </li>
                ))}
                <li className="rounded-2xl border-2 border-dashed border-ink/15 px-4 py-3">
                  <p className="font-display text-lg font-bold">{DEMO_CONTROL_CLASS.name}</p>
                  <p className="text-sm">Không dùng app · {DEMO_CONTROL_CLASS.size} bạn</p>
                  <p className="text-xs text-muted">Chỉ có phiếu khảo sát trước / sau, để so sánh</p>
                </li>
              </ul>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                {[
                  ["Lần check-in", overview.counts.checkins],
                  ["Chuyện bận lòng", overview.counts.worries],
                  ["Cảnh báo (đang mở)", `${overview.counts.alerts} (${overview.counts.openAlerts})`],
                  ["Lời nhờ giúp", overview.counts.help],
                ].map(([label, value]) => (
                  <div key={label as string} className="rounded-2xl bg-surface-2 px-3 py-2">
                    <dt className="text-xs text-muted">{label}</dt>
                    <dd className="font-display text-xl font-bold tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">
              Chưa có. Bấm Tạo để có 3 lớp mẫu (7A, 7B, 8C · 58 bạn), 3 GVCN mẫu, 1 tư vấn viên mẫu và 30 ngày hoạt động, cùng phiếu khảo sát của 1 lớp
              không dùng app.
            </p>
          )}
          <div className="mt-5">
            <DemoDataPanel hasData={Boolean(overview)} />
          </div>
        </div>

        <div className="rounded-[var(--radius-card)] bg-sky p-5">
          <h2 className="font-display text-2xl font-bold tracking-tight">Luật an toàn</h2>
          <ul className="mt-3 space-y-2.5 text-sm leading-relaxed">
            <li>🔐 Chỉ admin bật được. Bật chỉ có tác dụng trên máy này, và máy chủ kiểm tra lại vai trò mỗi lần mở trang.</li>
            <li>🙈 Khi bật: chỉ hiện lớp mẫu, không hiện học sinh thật nào. Khi tắt: lớp mẫu biến mất khỏi mọi trang và mọi con số.</li>
            <li>🧪 Tài khoản mẫu có mã lớp <code>MAU-</code> và email <code>@demo.fmood.invalid</code>: không ai đăng nhập được, không email nào được gửi.</li>
            <li>🚫 Không có câu nguy hiểm thật: tình huống nguy hiểm là giả lập, chỉ ghi “câu mẫu”.</li>
            <li>⏩ Tua nhanh chỉ chạy với tài khoản mẫu (kiểm tra 3 dấu hiệu, có test tự động).</li>
            <li>🔒 Khi bật, các nút sửa dữ liệu thật dùng chung (lời dặn, tài liệu, lớp, tài khoản thầy cô) bị khóa.</li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="script-title" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="script-title" className="font-display text-3xl font-extrabold tracking-tight">
            Kịch bản {Math.round(totalMinutes())} phút
          </h2>
          <p className="text-sm text-muted">Trình bày theo đúng thứ tự này: đi từ câu chuyện của một bạn, rồi mới vào bên trong máy.</p>
        </div>
        <ol className="space-y-3">
          {DEMO_SECTIONS.map((s, i) => (
            <li key={s.slug} className={cn("rounded-[var(--radius-card)] p-5", TONES[i])}>
              <div className="flex flex-wrap items-start gap-4">
                <span className="font-display text-5xl font-extrabold leading-none tabular-nums text-ink/25" aria-hidden>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-muted">khoảng {String(s.minutes).replace(".", ",")} phút</p>
                  <h3 className="font-display text-2xl font-bold tracking-tight">
                    <span aria-hidden>{s.emoji}</span> {s.title}
                  </h3>
                  <p className="mt-0.5">Trả lời câu: “{s.question}”</p>
                </div>
                <Link href={s.href} className="rounded-full bg-surface px-4 py-2 text-sm font-bold transition hover:-translate-y-0.5">
                  Mở phần này
                </Link>
              </div>
              <div className="mt-3">
                <SpeakerNotes section={s} />
              </div>
            </li>
          ))}
          <li className="rounded-[var(--radius-card)] border-2 border-dashed border-ink/15 p-5">
            <p className="font-display text-xl font-bold">Kết (30 giây)</p>
            <p className="mt-1 text-sm leading-relaxed">
              “F-Mood không thay thầy cô. Trợ lý giúp các bạn nói ra sớm hơn, giúp thầy cô biết sớm hơn, và giữ bí mật cho các bạn. Mọi điều em vừa cho
              xem đều chạy bằng code thật, có kiểm tra tự động.” Sau đó bấm <strong>Tắt trình diễn</strong>.
            </p>
          </li>
        </ol>
      </section>
    </div>
  );
}
