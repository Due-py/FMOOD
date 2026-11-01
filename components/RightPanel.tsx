import { cn } from "@/components/ui/cn";

/**
 * Panel phải (≥ 1280px): neo sát mép phải trình duyệt, cao hết màn, đối xứng với menu trái; layout (app) chừa chỗ bằng
 * `xl:has-[[data-right-panel]]:pr-[var(--right-panel-w)]`, nội dung giữa nằm sát menu trái. Độ rộng `--right-panel-w` do layout
 * đặt (thường 300px; Học cùng AI 320–440px theo màn hình). Nhỏ hơn 1280px: nằm trong dòng chảy trang, trang tự quyết ẩn đi hay
 * xếp dưới nội dung.
 */
export function RightPanel({ className, children, bare = false, ...rest }: React.ComponentProps<"aside"> & { bare?: boolean }) {
  return (
    <aside
      data-right-panel
      {...rest}
      className={cn(
        "xl:fixed xl:inset-y-0 xl:right-0 xl:z-30 xl:w-[var(--right-panel-w,300px)] xl:border-l xl:border-line",
        // bare: trang tự lo nền, lề và cuộn (Học cùng AI: nền trùng nền trang, thanh thẻ dính, thu gọn được)
        !bare && "xl:overflow-y-auto xl:bg-surface xl:px-5 xl:pb-6 xl:pt-8",
        className,
      )}
    >
      {children}
    </aside>
  );
}
