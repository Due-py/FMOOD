import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { allSurveys } from "@/lib/admin-data";
import { surveysFor } from "@/lib/class-content";
import { MIN_GROUP } from "@/lib/staff-privacy";
import { PageHeader } from "@/components/PageHeader";
import { PlusIcon } from "@/components/ui/icons";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { NotReady } from "../NotReady";

export const metadata: Metadata = { title: "Phiếu khảo sát" };

const SURVEY_STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Nháp", cls: "bg-surface-2" },
  open: { label: "Đang mở", cls: "bg-mint" },
  closed: { label: "Đã đóng", cls: "bg-butter" },
};

export default async function SurveysPage() {
  const profile = await requireStaff(["admin", "teacher"]);
  const forTeacher = profile.role === "teacher";
  const { ready, items } = forTeacher ? await surveysFor(profile) : { ready: true, items: await allSurveys() };
  const surveys = items;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={forTeacher ? "Lớp học" : "Nghiên cứu"}
        title={forTeacher ? "Câu hỏi cho lớp" : "Phiếu khảo sát"}
        action={
          ready ? (
            <Link href="/staff/surveys/new" className={btn.primary}>
              <PlusIcon size={18} /> {forTeacher ? "Hỏi lớp" : "Phiếu mới"}
            </Link>
          ) : undefined
        }
      >
        <p className="mt-2 max-w-2xl text-sm text-muted">
          {forTeacher
            ? `Hỏi nhanh cả lớp vài câu. Câu hỏi hiện trên trang chủ của học sinh lớp thầy cô; kết quả chỉ hiện khi có từ ${MIN_GROUP} bạn trả lời, không có tên.`
            : "Phiếu đang mở hiện trên trang chủ học sinh (đúng lớp được chọn). Mỗi em trả lời một lần, kết quả xem ẩn danh."}
        </p>
      </PageHeader>

      {!ready ? (
        <NotReady />
      ) : surveys.length === 0 ? (
        <p className="rounded-3xl bg-surface-2 p-8 text-center text-muted">
          {forTeacher ? "Chưa có câu hỏi nào. Bấm “Hỏi lớp” để bắt đầu, có sẵn 3 câu hỏi mẫu." : "Chưa có phiếu nào. Tạo phiếu đầu tiên, ví dụ đánh giá sau 2 tuần dùng thử."}
        </p>
      ) : (
        <ul className="space-y-3">
          {surveys.map((s) => (
            <li key={s.id}>
              <Link href={`/staff/surveys/${s.id}`} className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-5 transition hover:bg-surface-2">
                <span className="text-2xl" aria-hidden>
                  📋
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg font-bold tracking-tight">{s.title}</span>
                  <span className="block text-sm text-muted">
                    {s.questions.length} câu hỏi · {s.class_ids?.length ? `${s.class_ids.length} lớp` : "mọi lớp"}
                  </span>
                </span>
                <span className={cn("rounded-full px-3 py-1 text-xs font-bold", SURVEY_STATUS[s.status].cls)}>{SURVEY_STATUS[s.status].label}</span>
                <span className="w-24 text-right">
                  <span className="block font-display text-2xl font-extrabold">{s.responses}</span>
                  <span className="text-xs text-muted">lượt trả lời</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
