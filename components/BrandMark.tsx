// Chữ thương hiệu "F-Mood – Safe & Sound" (Duy chọn phương án A, 01/11): "F-Mood" và dòng slogan nhỏ in hoa giãn chữ
// màu xanh thương hiệu ở dưới. Dùng ở header học sinh (máy tính, điện thoại) và thanh bên trang thầy cô.
import { cn } from "@/components/ui/cn";

export const SLOGAN = "Safe & Sound";

export function BrandMark({ size = "md", className }: { size?: "sm" | "md"; className?: string }) {
  return (
    <span className={cn("flex flex-col leading-none", className)}>
      <span className={cn("font-display font-extrabold tracking-tight", size === "md" ? "text-lg" : "text-base")}>F-Mood</span>
      <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-display">{SLOGAN}</span>
    </span>
  );
}
