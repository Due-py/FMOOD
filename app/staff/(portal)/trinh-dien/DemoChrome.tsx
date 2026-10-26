import Link from "next/link";
import { DEMO_SECTIONS, DEMO_STEPS, type DemoSection } from "@/lib/demo/sections";
import { DemoToggle } from "@/components/staff/DemoBanner";
import { cn } from "@/components/ui/cn";

// Khung chung của các phần trình diễn: thanh các bước, câu hỏi của giám khảo, gợi ý lời nói, nút sang phần sau.

export function sectionBySlug(slug: string): DemoSection {
  return DEMO_SECTIONS.find((s) => s.slug === slug) as DemoSection;
}

export function DemoStepHeader({ slug, demo, hasData }: { slug: string; demo: boolean; hasData: boolean }) {
  const s = sectionBySlug(slug);
  const n = DEMO_SECTIONS.indexOf(s) + 1;
  return (
    <header className="space-y-5">
      <nav aria-label="Các phần trình diễn" className="print:hidden">
        <ol className="flex gap-1.5 overflow-x-auto pb-1">
          <li>
            <Link href="/staff/trinh-dien" className="flex h-9 items-center whitespace-nowrap rounded-full bg-surface-2 px-3 text-sm font-semibold text-muted hover:text-ink">
              Mục lục
            </Link>
          </li>
          {DEMO_STEPS.map((step) => (
            <li key={step.slug}>
              <Link
                href={step.href}
                aria-current={step.slug === slug ? "step" : undefined}
                className={cn(
                  "flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-semibold transition",
                  step.slug === slug ? "bg-ink text-surface" : "bg-surface-2 text-muted hover:text-ink",
                )}
              >
                <span aria-hidden>{step.emoji}</span>
                {step.title}
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          <p className="text-sm font-semibold text-muted">
            Phần {n} · khoảng {String(s.minutes).replace(".", ",")} phút
          </p>
          <h1 className="mt-1 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            <span aria-hidden>{s.emoji}</span> {s.title}
          </h1>
          <p className="mt-3 text-lg leading-snug">
            <span className="text-muted">Giám khảo hỏi:</span> “{s.question}”
          </p>
        </div>
      </div>

      {!hasData ? (
        <p className="rounded-[var(--radius-card)] bg-peach px-5 py-4 text-sm">
          Chưa có dữ liệu mẫu. Vào{" "}
          <Link href="/staff/trinh-dien" className="font-semibold underline">
            Mục lục trình diễn
          </Link>{" "}
          để tạo trước nhé.
        </p>
      ) : (
        !demo && (
          <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-ink/15 px-5 py-3 text-sm print:hidden">
            <span className="flex-1">Chế độ trình diễn đang tắt: phần này vẫn chạy, nhưng các trang khác chưa hiện dữ liệu mẫu.</span>
            <DemoToggle on={false} compact />
          </div>
        )
      )}

      <SpeakerNotes section={s} />
    </header>
  );
}

/** Gợi ý bấm gì / nói gì (đóng sẵn, mở khi cần, không in ra). */
export function SpeakerNotes({ section, open = false }: { section: DemoSection; open?: boolean }) {
  return (
    <details open={open} className="group rounded-[var(--radius-card)] bg-lilac/70 px-5 py-3 print:hidden">
      <summary className="cursor-pointer list-none font-semibold">
        <span className="mr-1 inline-block transition group-open:rotate-90" aria-hidden>
          ▸
        </span>
        Gợi ý cho người trình bày
      </summary>
      <div className="mt-3 grid gap-4 text-sm leading-relaxed sm:grid-cols-2">
        <div>
          <p className="font-semibold">Bấm gì</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            {section.doThis.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
        </div>
        <div>
          <p className="font-semibold">Nói gì</p>
          <ul className="mt-1 space-y-1.5">
            {section.say.map((x) => (
              <li key={x}>“{x}”</li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}

export function DemoStepFooter({ slug }: { slug: string }) {
  const i = DEMO_SECTIONS.findIndex((s) => s.slug === slug);
  const next = DEMO_SECTIONS[i + 1];
  return (
    <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 print:hidden">
      <Link href="/staff/trinh-dien" className="text-sm font-semibold text-muted hover:text-ink">
        ← Mục lục trình diễn
      </Link>
      {next && (
        <Link href={next.href} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 font-bold text-surface transition hover:-translate-y-0.5">
          Phần tiếp: {next.emoji} {next.title}
        </Link>
      )}
    </footer>
  );
}
