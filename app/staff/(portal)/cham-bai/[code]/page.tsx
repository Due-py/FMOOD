import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePage } from "@/lib/permissions";
import { gradingLock, raterQueue, raterSlot, responseForRater } from "@/lib/bai-do-server";
import { ArrowLeft } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { ScoreForm } from "./ScoreForm";

export const metadata: Metadata = { title: "Chấm bài" };

/** Một bài cho người chấm: chỉ mã chấm, 9 câu trả lời và 12 ô điểm. Admin không mở được trang này. */
export default async function GradeOnePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^B\d{3,4}$/.test(code)) notFound();
  const profile = await requirePage("/staff/cham-bai", ["teacher", "counselor"]);
  const slot = await raterSlot(profile);
  if (!slot) notFound();
  const [data, queue, { lock }] = await Promise.all([responseForRater(profile, slot, code), raterQueue(profile, slot), gradingLock()]);
  if (!data) notFound();

  const i = queue.findIndex((q) => q.code === code);
  const next = queue.slice(i + 1).find((q) => !q.done) ?? queue.find((q) => !q.done && q.code !== code);
  const done = queue.filter((q) => q.done).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/staff/cham-bai" className={cn(btn.ghost, "-ml-3")}>
          <ArrowLeft size={18} /> Danh sách bài
        </Link>
        <span className="text-sm text-muted">
          Người chấm {slot} · đã chấm {done}/{queue.length} ·{" "}
          <Link href="/staff/cham-bai/huong-dan" target="_blank" className="font-semibold underline underline-offset-4">
            Hướng dẫn chấm ↗
          </Link>
        </span>
      </div>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Bài <span className="font-mono">{data.code}</span>
      </h1>
      <ScoreForm
        code={data.code}
        answers={data.answers}
        initial={data.score}
        locked={Boolean(lock.locked_at)}
        prevCode={i > 0 ? queue[i - 1].code : null}
        nextCode={next?.code ?? null}
      />
    </div>
  );
}
