import { cn } from "@/components/ui/cn";

/**
 * Panel phải (≥ 1280px): neo sát mép phải trình duyệt, cao hết màn, đối xứng với menu trái; layout (app) chừa chỗ bằng
 * `xl:has-[[data-right-panel]:not([data-collapsed])]:pr-[var(--right-panel-w)]` (panel đánh dấu data-collapsed thì không chừa),
 * nội dung giữa nằm sát menu trái. Độ rộng `--right-panel-w` do layout
 * đặt (thường 300px; Học cùng AI 320–440px theo màn hình). Nhỏ hơn 1280px: nằm trong dòng chảy trang, trang tự quyết ẩn đi hay
 * xếp dưới nội dung.
 */
export function RightPanel({ className, children, bare = false, ...rest }: React.ComponentProps<"aside"> & { bare?: boolean }) {
  return (
    <aside
      data-right-panel
      {...rest}
      className={cn(
        "xl:fixed xl:right-0 xl:top-0 xl:z-30 xl:w-[var(--right-panel-w,300px)]",
        // bare: trang tự lo chiều cao, viền, nền, lề và cuộn (Học cùng AI: mở thì nền trắng như mặc định, thu gọn lên trên còn thanh thẻ trên nền trang)
        !bare && "xl:bottom-0 xl:overflow-y-auto xl:border-l xl:border-line xl:bg-surface xl:px-5 xl:pb-6 xl:pt-8",
        className,
      )}
    >
      {children}
    </aside>
  );
}
