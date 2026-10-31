import type { Metadata } from "next";
import Link from "next/link";
import { requirePage } from "@/lib/permissions";
import { demoOn } from "@/lib/demo/server";
import { teachOverview } from "@/lib/demo/teach";
import { SAFETY_CASES } from "@/lib/eval/safety-cases";
import { REPLY_CASES } from "@/lib/eval/reply-cases";
import { cn } from "@/components/ui/cn";
import { DemoStepFooter, DemoStepHeader } from "../DemoChrome";
import { TeachTry } from "./TeachTry";

export const metadata: Metadata = { title: "Trình diễn: Trợ lý được dạy thế nào" };

const when = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "numeric", month: "numeric" }).format(new Date(iso));

export default async function TeachPage() {
  await requirePage("/staff/trinh-dien");
  const [demo, o] = await Promise.all([demoOn(), teachOverview()]);

  // 9 phần lời dặn, đúng thứ tự được ghép (lib/ai/prompts.ts: promptParts)
  const layers = [
    {
      n: 1,
      title: "Mở đầu",
      who: "Máy chủ ghép",
      href: null,
      tone: "bg-sky",
      body: `Trợ lý tự xưng là nhân vật học sinh chọn (mặc định ${o.style.character}) và gọi học sinh bằng biệt danh. Câu khẩn cấp soạn sẵn không đổi theo nhân vật.`,
    },
    {
      n: 2,
      title: "Nguyên tắc an toàn",
      who: "Admin chỉnh",
      href: "/staff/may/rules",
      tone: "bg-peach",
      body: o.safety.length ? `${o.safety.length} điều, ví dụ: “${o.safety.find((r) => r.startsWith("KHÔNG")) ?? o.safety[0]}”` : "Đang để trống (giới hạn khóa ở phần 9 vẫn luôn có)",
    },
    {
      n: 3,
      title: "Cách nói chuyện chung",
      who: "Admin chỉnh, mọi nhân vật",
      href: "/staff/may/rules",
      tone: "bg-mint",
      body: o.talk.length ? `${o.talk.length} điều, ví dụ: “${o.talk.find((r) => r.startsWith("Gọi học sinh")) ?? o.talk[0]}”` : "Đang để trống",
    },
    {
      n: 4,
      title: "Phong cách học sinh chọn",
      who: "Học sinh chọn, admin sửa câu chữ",
      href: "/staff/may/tro-chuyen",
      tone: "bg-butter",
      body: `Mặc định: ${o.style.character} · ${o.style.length} (tối đa ${o.style.words} từ) · ${o.style.guidance} · ${o.style.motivation}. Phong cách chỉ đổi giọng văn và độ dài, không đổi quy tắc.`,
    },
    {
      n: 5,
      title: "Quy tắc QT và hướng dẫn luyện HL",
      who: o.rulesMeta.updatedBy ? `Sửa lần cuối bởi ${o.rulesMeta.updatedBy}` : "Bản mặc định",
      href: "/staff/may/rules",
      tone: "bg-lilac",
      body: `${o.rules.length} điều QT, ví dụ: “${o.rules.find((r) => r.startsWith("QT11")) ?? o.rules[0]}”, cùng 7 hướng dẫn luyện HL01–HL07 (không làm hộ).`,
    },
    {
      n: 6,
      title: "Gợi ý và kết thúc",
      who: "Admin chỉnh",
      href: "/staff/may/rules",
      tone: "bg-sky",
      body: o.cards
        ? "Thẻ mục tiêu (thêm vào thói quen), thẻ kỹ năng (mở bài luyện), thẻ dừng. Máy chủ kiểm tra chặt và bỏ thẻ ở lượt đáng lo."
        : "Đang để trống: trợ lý không đưa thẻ gợi ý",
    },
    {
      n: 7,
      title: "Kỹ năng có thể gợi ý",
      who: "Máy chủ ghép",
      href: "/luyen",
      tone: "bg-mint",
      body: o.skills.length ? o.skills.join(" · ") : "Chưa có bài luyện nào đang bật",
    },
    {
      n: 8,
      title: "Bối cảnh từng lượt",
      who: "Chỉ thêm khi khớp",
      href: "/staff/may/scenarios",
      tone: "bg-butter",
      body: `Hướng dẫn theo chủ đề: ${o.scenarios.length ? o.scenarios.map((s) => `${s.title} (${s.triggers} cụm từ)`).join(" · ") : "chưa có"}. Tài liệu đã duyệt: ${o.docs.length ? `${o.docs.length} tài liệu, ${o.docs.reduce((s, d) => s + d.chunks, 0)} đoạn` : "chưa có"}. Lượt đáng lo: thêm lưu ý nhẹ nhàng, khuyến khích kể với người lớn.`,
    },
    {
      n: 9,
      title: "Giới hạn khóa",
      who: "Không ai sửa được",
      href: null,
      tone: "bg-peach",
      body: o.locked.map((l) => `“${l}”`).join(" "),
    },
  ];

  return (
    <div className="space-y-8">
      <DemoStepHeader slug="day-may" demo={demo} hasData />

      <section aria-labelledby="layers-title" className="space-y-3">
        <h2 id="layers-title" className="font-display text-2xl font-bold tracking-tight">
          Mỗi câu trả lời được dặn theo 9 phần, từ trên xuống
        </h2>
        <p className="max-w-3xl text-sm text-muted">
          Trợ lý <strong>không tự học</strong> từ tin nhắn của học sinh. Mọi thứ trợ lý biết đều do thầy cô viết và duyệt; mỗi lần sửa đều lưu lại bản cũ để quay
          lại được ({o.versions} bản trước đang được giữ).
        </p>
        <ol className="space-y-2">
          {layers.map((l) => (
            <li key={l.n} className={cn("flex flex-wrap items-start gap-4 rounded-[var(--radius-card)] p-4", l.tone)}>
              <span className="font-display text-3xl font-extrabold leading-none text-ink/25" aria-hidden>
                {l.n}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-bold leading-tight">
                  {l.title} <span className="text-sm font-semibold text-muted">· {l.who}</span>
                </p>
                <p className="mt-1 text-sm leading-relaxed">{l.body}</p>
              </div>
              {l.href && (
                <Link href={l.href} className="rounded-full bg-surface/80 px-3 py-1.5 text-sm font-semibold">
                  Xem
                </Link>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="try-title" className="space-y-3 rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <h2 id="try-title" className="font-display text-2xl font-bold tracking-tight">
          Dạy thử
        </h2>
        <p className="text-sm text-muted">Thêm một lời dặn tạm rồi so câu trả lời. Không lưu gì: trợ lý thật của các bạn vẫn giữ nguyên.</p>
        <TeachTry />
      </section>

      <section aria-labelledby="check-title" className="space-y-3">
        <h2 id="check-title" className="font-display text-2xl font-bold tracking-tight">
          Dạy xong thì kiểm tra lại
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Check
            title="Bộ câu thử an toàn"
            value={o.risk ? `${o.risk.passed}/${o.risk.total}` : "Chưa chạy"}
            note={`${SAFETY_CASES.length} câu có sẵn (câu nói quá, câu viết tắt, câu nói vòng vo) + câu thầy cô thêm.${o.risk ? ` Lần chạy gần nhất: ${when(o.risk.created_at as string)}.` : ""}`}
          />
          <Check
            title="Bộ câu thử câu trả lời"
            value={o.reply ? `${o.reply.passed}/${o.reply.total}` : "Chưa chạy"}
            note={`${REPLY_CASES.length} tin nhắn mẫu, máy chấm: xưng “mình” hoặc tên nhân vật, gọi “bạn”, không chẩn đoán, ngắn gọn theo mức độ dài…${o.reply ? ` Lần gần nhất: ${when(o.reply.created_at as string)}.` : ""}`}
          />
          <Check
            title="Học sinh chấm 👍 / 👎"
            value={`${o.feedback.ups} 👍 · ${o.feedback.downs} 👎`}
            note="Mỗi bạn chấm câu trả lời; trợ lý điều chỉnh cách nói với riêng bạn đó (ngắn hơn, ít hỏi hơn…), không đổi luật."
          />
        </div>
        <p className="text-sm">
          <Link href="/staff/eval" className="font-semibold underline">
            Mở trang Bộ câu thử
          </Link>{" "}
          để chạy lại ngay trước mặt giám khảo (bộ an toàn mất khoảng 1 phút).
        </p>
      </section>
      <DemoStepFooter slug="day-may" />
    </div>
  );
}

function Check({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="rounded-[var(--radius-card)] bg-surface-2 p-4">
      <p className="text-sm font-semibold text-muted">{title}</p>
      <p className="font-display text-3xl font-extrabold tabular-nums">{value}</p>
      <p className="mt-1 text-sm leading-snug">{note}</p>
    </div>
  );
}
