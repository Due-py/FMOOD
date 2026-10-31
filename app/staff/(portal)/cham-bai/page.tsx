import type { Metadata } from "next";
import Link from "next/link";
import { type Profile } from "@/lib/auth";
import { requirePage } from "@/lib/permissions";
import { gradingLock, gradingOverview, mappingRows, raterQueue, raterSlot, scoreRows } from "@/lib/bai-do-server";
import { MAPPING_CSV_HEADER, SCORE_CSV_HEADER, scoreCsvRow } from "@/lib/test-scoring";
import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/admin/AdminUI";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { ExportButton } from "../research/ExportButton";
import { GradingAdmin } from "./GradingAdmin";

export const metadata: Metadata = { title: "Chấm bài" };

/**
 * CHẤM MÙ BÀI ĐO KỸ NĂNG (kế hoạch Demo 3, mục 6.7).
 * Admin: giao người chấm, mở chấm, khóa điểm, tải bảng — chỉ thấy số đếm, không bao giờ thấy bài làm.
 * Người chấm (giáo viên / tư vấn viên được giao): chấm từng bài, chỉ thấy mã chấm và 9 câu trả lời.
 */
export default async function GradingPage() {
  const profile = await requirePage("/staff/cham-bai");
  if (profile.role === "admin") return <AdminView />;
  const slot = await raterSlot(profile);
  if (!slot) {
    return (
      <div>
        <PageHeader eyebrow="Nghiên cứu" title="Chấm bài" />
        <p className="rounded-[var(--radius-card)] bg-surface-2 p-6 text-center text-muted">
          Thầy cô chưa được giao chấm bài đo kỹ năng. Khi admin giao, danh sách bài sẽ hiện ở đây.
        </p>
      </div>
    );
  }
  return <RaterView profile={profile} slot={slot} />;
}

async function RaterView({ profile, slot }: { profile: Profile; slot: 1 | 2 }) {
  const [queue, { lock }] = await Promise.all([raterQueue(profile, slot), gradingLock()]);
  const done = queue.filter((q) => q.done).length;
  const next = queue.find((q) => !q.done);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Người chấm ${slot}`}
        title="Chấm bài"
        action={
          next && !lock.locked_at ? (
            <Link href={`/staff/cham-bai/${next.code}`} className={btn.primary}>
              {done ? "Chấm tiếp" : "Bắt đầu chấm"}
            </Link>
          ) : undefined
        }
      >
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Mỗi bài chỉ có một mã ngẫu nhiên và 9 câu trả lời; không có tên, lớp, lần hay đề. Chấm theo{" "}
          <Link href="/staff/cham-bai/huong-dan" className="font-semibold underline underline-offset-4">
            hướng dẫn chấm
          </Link>
          , chấm riêng, không trao đổi với người chấm còn lại trước khi khóa điểm.
          {slot === 2 && " Thầy cô chấm lại 30 bài được chọn ngẫu nhiên để đo độ đồng ý."}
        </p>
      </PageHeader>

      {lock.locked_at && (
        <p className="rounded-[var(--radius-card)] bg-butter p-5 text-sm">Điểm đã khóa. Cảm ơn thầy cô đã chấm! Thầy cô vẫn xem lại được, nhưng không sửa được nữa.</p>
      )}

      {queue.length === 0 ? (
        <p className="rounded-[var(--radius-card)] bg-surface-2 p-6 text-center text-muted">Chưa có bài nào để chấm. Admin sẽ mở chấm sau buổi đo lần 2.</p>
      ) : (
        <Section title={`Đã chấm ${done}/${queue.length} bài`} description="Bài đã chấm đủ 12 ô có dấu ✓. Bấm một mã để chấm hoặc xem lại.">
          <div className="mb-4 h-3 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-brand" style={{ width: `${(done / queue.length) * 100}%` }} />
          </div>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {queue.map((q) => (
              <li key={q.code}>
                <Link
                  href={`/staff/cham-bai/${q.code}`}
                  className={cn(
                    "block rounded-2xl border px-3 py-2 text-center font-mono text-sm font-semibold transition hover:bg-surface-2",
                    q.done ? "border-transparent bg-mint" : q.started ? "border-brand/50 bg-brand-soft" : "border-line",
                  )}
                >
                  {q.code}
                  {q.done ? " ✓" : ""}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

async function AdminView() {
  const overview = await gradingOverview();
  const locked = Boolean(overview.lock.locked_at);
  const [scores, mapping] = overview.ready ? await Promise.all([scoreRows(), locked ? mappingRows() : Promise.resolve([])]) : [[], []];
  const scoreCsv = [SCORE_CSV_HEADER, ...scores.map(scoreCsvRow)];
  const mappingCsv = [
    MAPPING_CSV_HEADER,
    ...mapping.map((m) => [
      m.code,
      m.student,
      m.account,
      m.className,
      m.round ?? "",
      m.form ?? "",
      m.readBefore,
      m.aiUse,
      m.durationS ?? "",
      m.pasteBlocked,
      m.submittedAt,
      m.referred ? "có" : "",
    ]),
  ];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Nghiên cứu" title="Chấm bài đo">
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Hai thầy cô ngoài nhóm chấm mù bài đo kỹ năng. Trang này chỉ có số đếm: admin không đọc được bài làm của học sinh. Bảng ghép mã
          với tài khoản chỉ mở sau khi khóa điểm.{" "}
          <Link href="/staff/cham-bai/huong-dan" className="font-semibold underline underline-offset-4">
            Xem hướng dẫn chấm
          </Link>
        </p>
      </PageHeader>

      {!overview.ready ? (
        <p className="rounded-[var(--radius-card)] bg-butter p-6 text-center">
          <span className="block font-semibold">Phần này chưa mở</span>
          <span className="mt-1 block text-sm text-muted">Cần chạy cập nhật cơ sở dữ liệu 0018_bai_do.sql trước.</span>
        </p>
      ) : (
        <>
          <Section title="Bài đo đã nộp" description="Chỉ số bài, theo từng phiếu. Mở / đóng phiếu ở trang Phiếu khảo sát.">
            {overview.perSurvey.length === 0 ? (
              <p className="text-sm text-muted">Chưa có phiếu bài đo. Tạo bằng lệnh: npm run bai-do:tao -- --lop 8A1,8A4 --ghi</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {overview.perSurvey.map((s) => (
                  <li key={s.title} className="flex justify-between py-2">
                    <span>
                      {s.title} <span className="text-muted">· {s.status === "open" ? "đang mở" : s.status === "closed" ? "đã đóng" : "nháp"}</span>
                    </span>
                    <span className="font-semibold tabular-nums">{s.responses} bài</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <GradingAdmin
            raters={overview.raters}
            candidates={overview.candidates}
            opened={Boolean(overview.lock.opened_at)}
            locked={locked}
            lockedBy={overview.lock.locked_by_name}
            responses={overview.responses}
            coded={overview.coded}
            sample={overview.sample}
            progress={overview.progress}
            referred={overview.referred}
          />

          <Section
            title="Tải dữ liệu"
            description="Bảng điểm có đúng các cột của phiếu chấm trong bộ đo. Bảng ghép mã chỉ tải được sau khi khóa điểm. Hai bảng dùng cho script: npm run bai-do:tinh."
          >
            <div className="flex flex-wrap items-center gap-3">
              <ExportButton rows={scoreCsv} filename="cham-bai-tinh-huong.csv" />
              <span className="text-sm text-muted">Bảng điểm ({scores.length} dòng)</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {locked ? (
                <>
                  <ExportButton rows={mappingCsv} filename="KHOA-ghep-ma.csv" />
                  <span className="text-sm text-muted">Bảng ghép mã với tài khoản ({mapping.length} bài)</span>
                </>
              ) : (
                <span className="text-sm text-muted">🔒 Bảng ghép mã với tài khoản: mở sau khi khóa điểm.</span>
              )}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
