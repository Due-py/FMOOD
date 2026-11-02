import { cn } from "@/components/ui/cn";

/**
 * Một khối của Hành trình (giao diện vui, mẫu hanh-trinh.html): ô biểu tượng trắng hơi nghiêng + tiêu đề to, ghi chú dạng
 * viên thuốc trắng bên phải. Riêng cho Hành trình; khối ở Hôm nay vẫn dùng components/Section.
 */
export function JourneySection({
  id,
  emoji,
  title,
  note,
  children,
}: {
  id: string;
  emoji: string;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <span aria-hidden className="grid size-9 shrink-0 -rotate-6 place-items-center rounded-[0.9rem] bg-surface text-xl shadow-soft sm:size-10">
          {emoji}
        </span>
        <h2 id={id} className="font-display text-[1.3rem] font-extrabold leading-tight tracking-tight sm:text-[1.45rem]">
          {title}
        </h2>
        {note && <span className="ml-auto whitespace-nowrap rounded-full bg-surface px-3 py-1 text-xs font-bold text-muted">{note}</span>}
      </div>
      {children}
    </section>
  );
}

/** Dòng báo trống của Hành trình: nền trắng mờ, viền nét đứt. */
export function JourneyEmpty({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("rounded-[1.4rem] border-2 border-dashed border-line bg-surface/60 px-4 py-3.5 text-muted", className)}>{children}</p>
  );
}

/** Nút tròn nhỏ có mũi tên ▾, quay ngược khi mở. */
/** `white`: nền trắng (khi nằm trên thẻ màu hoặc thẻ kem). */
export function Chevron({ open, white, className }: { open?: boolean; white?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full text-xs text-muted transition-transform motion-reduce:transition-none",
        white ? "bg-surface" : "bg-surface-2",
        open && "rotate-180",
        className,
      )}
    >
      ▾
    </span>
  );
}

/** Nút trắng "chunky" (mẫu .go.white): viền và bóng màu đường kẻ, bấm thì lún xuống. */
export const btnWhite =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-line bg-surface px-5 py-2 text-sm font-bold text-ink shadow-[0_3px_0_var(--line)] transition duration-200 hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0_1px_0_var(--line)] motion-reduce:transition-none";
