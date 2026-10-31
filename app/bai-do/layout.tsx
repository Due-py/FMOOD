import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { isTestOnlyClass } from "@/lib/bai-do-server";
import { ArrowLeft } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

// Trang bài đo kỹ năng nằm ngoài khung app học sinh: lớp "chỉ làm bài đo" (lớp so sánh) chỉ vào được trang này,
// không có thanh điều hướng, không có trợ lý. Lớp dùng app vào từ thẻ trên trang chủ.
export default async function TestLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const testOnly = await isTestOnlyClass(profile.class_id);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-4 sm:px-6 md:pt-8">
      <header className="mb-4 flex items-center justify-between gap-3">
        {testOnly ? (
          <p className="font-display text-lg font-extrabold tracking-tight">F-Mood</p>
        ) : (
          <Link href="/home" className={cn(btn.ghost, "-ml-3")}>
            <ArrowLeft size={18} /> Trang chủ
          </Link>
        )}
        <div className="flex items-center gap-3 text-sm">
          <span className="truncate text-muted">{profile.nickname}</span>
          {/* thẻ <a> thường (không prefetch) để không vô tình đăng xuất */}
          {testOnly && (
            <a href="/signout" className="font-semibold text-muted underline underline-offset-4 hover:text-ink">
              Đăng xuất
            </a>
          )}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
