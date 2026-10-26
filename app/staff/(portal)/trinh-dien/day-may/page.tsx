import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { demoOn } from "@/lib/demo/server";
import { teachOverview } from "@/lib/demo/teach";
import { SAFETY_CASES } from "@/lib/eval/safety-cases";
import { REPLY_CASES } from "@/lib/eval/reply-cases";
import { cn } from "@/components/ui/cn";
import { DemoStepFooter, DemoStepHeader } from "../DemoChrome";
import { TeachTry } from "./TeachTry";

export const metadata: Metadata = { title: "Trình diễn: Mây được dạy thế nào" };

const when = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "numeric", month: "numeric" }).format(new Date(iso));

export default async function TeachPage() {
  await requireStaff(["admin"]);
  const [demo, o] = await Promise.all([demoOn(), teachOverview()]);

  // các lớp lời dặn, đúng thứ tự được ghép (lib/ai/prompts.ts: buildCompanionPrompt)
  const layers = [
    {
      n: 1,
      title: "Tính cách",
      who: "Admin chỉnh",
      href: "/staff/may/persona",
      tone: "bg-sky",
      body: `${o.persona.name}: ${o.persona.personality} ${o.persona.address} Tối đa ${o.persona.maxWords} từ mỗi câu trả lời.`,
    },
    {
      n: 2,
      title: "Lời dặn của thầy cô",
      who: o.rulesMeta.updatedBy ? `Sửa lần cuối bởi ${o.rulesMeta.updatedBy}` : "Bản mặc định",
      href: "/staff/may/rules",
      tone: "bg-mint",
      body: `${o.rules.length} điều, ví dụ: “${o.rules.find((r) => r.startsWith("KHÔNG chẩn đoán")) ?? o.rules[0]}”`,
    },
    {
      n: 3,
      title: "Luật cố định",
      who: "Không ai sửa được",
      href: null,
      tone: "bg-peach",
      body: o.locked.map((l) => `“${l}”`).join(" "),
    },
    {
      n: 4,
      title: "Hướng dẫn theo chủ đề",
      who: "Chỉ thêm khi tin nhắn khớp chủ đề",
      href: "/staff/may/scenarios",
      tone: "bg-butter",
      body: o.scenarios.length ? o.scenarios.map((s) => `${s.title} (${s.triggers} cụm từ)`).join(" · ") : "Chưa có",
    },
    {
      n: 5,
      title: "Tài liệu đã duyệt",
      who: "Chỉ thêm đoạn gần nghĩa nhất",
      href: "/staff/may/knowledge",
      tone: "bg-lilac",
      body: o.docs.length ? `${o.docs.length} tài liệu, ${o.docs.reduce((s, d) => s + d.chunks, 0)} đoạn: ${o.docs.slice(0, 3).map((d) => d.title).join(", ")}${o.docs.length > 3 ? "…" : ""}` : "Chưa có",
    },
    {
      n: 6,
      title: "Lưu ý cho lượt đáng lo",
      who: "Tự thêm khi bộ phân loại báo đáng lo",
      href: null,
      tone: "bg-peach",
      body: "Ghi nhận đó không phải lỗi của bạn ấy, khuyến khích kể với thầy cô / bố mẹ, không hỏi chi tiết gây đau lòng.",
    },
  ];

  return (
    <div className="space-y-8">
      <DemoStepHeader slug="day-may" demo={demo} hasData />

      <section aria-labelledby="layers-title" className="space-y-3">
        <h2 id="layers-title" className="font-display text-2xl font-bold tracking-tight">
          Mỗi câu trả lời được dặn theo 6 lớp, từ trên xuống
        </h2>
        <p className="max-w-3xl text-sm text-muted">
          Mây <strong>không tự học</strong> từ tin nhắn của học sinh. Mọi thứ Mây biết đều do thầy cô viết và duyệt; mỗi lần sửa đều lưu lại bản cũ để quay
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
        <p className="text-sm text-muted">Thêm một lời dặn tạm rồi so câu trả lời. Không lưu gì: Mây thật của các bạn vẫn giữ nguyên.</p>
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
            note={`${REPLY_CASES.length} tin nhắn mẫu, máy chấm: xưng “mình”, gọi “bạn”, không chẩn đoán, ngắn gọn…${o.reply ? ` Lần gần nhất: ${when(o.reply.created_at as string)}.` : ""}`}
          />
          <Check
            title="Học sinh chấm 👍 / 👎"
            value={`${o.feedback.ups} 👍 · ${o.feedback.downs} 👎`}
            note="Mỗi bạn chấm câu trả lời; Mây điều chỉnh cách nói với riêng bạn đó (ngắn hơn, ít hỏi hơn…), không đổi luật."
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
