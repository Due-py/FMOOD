// Mảnh giao diện vui dùng chung cho khu Kỹ năng (chọn tình huống, bài luyện) và bài đọc (Duy duyệt mẫu 02/11).
import Link from "next/link";
import { ArrowLeft } from "@/components/ui/icons";

/** Nút quay lại dạng viên trắng bóng mềm (mẫu giao diện vui, Duy duyệt 02/11): chọn tình huống, bài luyện, bài đọc. */
export function BackPill({ href = "/ky-nang", label = "Luyện kỹ năng" }: { href?: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-surface py-2 pl-3 pr-4 text-sm font-bold text-ink shadow-soft transition hover:-translate-x-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/50 motion-reduce:transform-none dark:border dark:border-line"
    >
      <ArrowLeft size={18} /> {label}
    </Link>
  );
}

/** Lời nhân vật: hình nhân vật vẫy tay + bong bóng thoại (tiêu đề tròn, một dòng hướng dẫn). */
export const bubble = {
  wrap: "flex items-end gap-1",
  box: "mb-5 min-w-0 flex-1 rounded-[22px] rounded-bl-md bg-surface px-[18px] py-3 shadow-soft dark:border dark:border-line",
  title: "font-display text-[21px] font-extrabold leading-tight text-ink sm:text-2xl",
  text: "mt-0.5 text-sm text-muted",
} as const;

/** Nút phụ trắng, cùng dáng "bấm lún" với nút chính (viền và bóng màu kem đậm). */
export const chunkyWhite =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-line bg-surface px-5 py-2.5 font-bold text-ink shadow-[0_3px_0_var(--line)] transition duration-200 hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0_1px_0_var(--line)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/50 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transform-none";
