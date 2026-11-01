// Chữ thương hiệu "F-Mood – Safe & Sound" (Duy chọn phương án A, 01/11; giữ dòng slogan dưới logo theo quyết định 01/11 chiều):
// "F-Mood" màu nghệ đậm và dòng slogan in hoa giãn chữ ở dưới. Dùng ở menu học sinh (máy tính, điện thoại) và thanh bên trang thầy cô.
import { cn } from "@/components/ui/cn";

export const SLOGAN = "Safe & Sound";

export function BrandMark({ size = "md", className }: { size?: "sm" | "md"; className?: string }) {
  return (
    <span className={cn("flex shrink-0 flex-col leading-none", className)}>
      <span className={cn("font-display font-extrabold tracking-tight text-brand-strong", size === "md" ? "text-lg" : "text-base")}>F-Mood</span>
      <span className="mt-0.5 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{SLOGAN}</span>
    </span>
  );
}
