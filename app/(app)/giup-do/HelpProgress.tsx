import { helpProgress, type HelpRequest, type ProgressStep } from "@/lib/help-requests-shared";
import { cn } from "@/components/ui/cn";

const TIME = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "numeric", month: "numeric" });

/** Lời nhờ đang ở đâu: Đã gửi → Thầy cô đã xem → Thầy cô đã trả lời. Bước chưa xảy ra thì để mờ. */
export function HelpProgress({ request, steps }: { request?: Pick<HelpRequest, "created_at" | "seen_at" | "replied_at" | "reply">; steps?: ProgressStep[] }) {
  const list = steps ?? (request ? helpProgress(request) : []);
  return (
    <ol className="grid grid-cols-3 gap-1.5 text-center text-xs" aria-label="Lời nhờ đang ở đâu">
      {list.map((s) => (
        <li key={s.key} className={cn("rounded-2xl px-2 py-2", s.at ? "bg-surface font-semibold" : "border border-dashed border-line text-muted")}>
          <span aria-hidden>{s.at ? "✓ " : "… "}</span>
          {s.label}
          {s.at && <span className="block font-normal text-muted">{TIME.format(new Date(s.at))}</span>}
          {!s.at && <span className="sr-only"> (chưa)</span>}
        </li>
      ))}
    </ol>
  );
}
