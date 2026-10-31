import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { testsForStudent } from "@/lib/bai-do-server";
import { ArrowUpRight } from "@/components/ui/icons";
import { pill } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Bài đo kỹ năng" };

/** Danh sách bài đo đang mở cho học sinh (mỗi lần đo chỉ có đúng đề được giao). */
export default async function TestsPage() {
  const profile = await requireProfile();
  const tests = await testsForStudent(profile);

  return (
    <div>
      <span className={pill}>Bài đo kỹ năng</span>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">Chào {profile.nickname}!</h1>

      {tests.length === 0 ? (
        <p className="mt-6 rounded-3xl bg-surface-2 p-6 text-center text-muted">
          Hiện chưa có bài đo nào đang mở. Khi thầy cô mở bài, em tải lại trang này nhé.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {tests.map(({ survey, answered }) => (
            <li key={survey.id}>
              {answered ? (
                <p className="flex items-center gap-3 rounded-[var(--radius-card)] bg-mint p-5">
                  <span className="text-2xl" aria-hidden>
                    ✅
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{survey.title}</span>
                    <span className="block text-sm text-muted">Em đã nộp bài này. Cảm ơn em!</span>
                  </span>
                </p>
              ) : (
                <Link
                  href={`/bai-do/${survey.id}`}
                  className="flex items-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-brand/50 bg-brand-soft p-5 transition hover:-translate-y-0.5"
                >
                  <span className="text-2xl" aria-hidden>
                    📝
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{survey.title}</span>
                    <span className="block text-sm text-muted">Khoảng 15–20 phút · Bấm để bắt đầu</span>
                  </span>
                  <ArrowUpRight size={18} />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
