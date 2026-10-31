import Link from "next/link";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

/** Chưa chạy migration 0017 (chưa có bảng bài luyện): báo nhẹ nhàng, không báo lỗi kỹ thuật. */
export function NotReady() {
  return (
    <div role="status" className="rounded-[var(--radius-card)] bg-surface-2 p-5">
      <p className="font-semibold">Phần luyện kỹ năng chưa sẵn sàng.</p>
      <p className="mt-1 text-sm text-muted">Thầy cô đang chuẩn bị, bạn quay lại sau nhé. Trong lúc chờ, bạn vẫn có thể thử một việc nhỏ hoặc trò chuyện.</p>
      <Link href="/home" className={cn(btn.secondary, "mt-4")}>
        Về trang chủ
      </Link>
    </div>
  );
}
