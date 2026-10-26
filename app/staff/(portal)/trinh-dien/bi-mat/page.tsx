import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { classPulse } from "@/lib/class-pulse";
import { demoProfile } from "@/lib/demo/people";
import { demoOn, demoRegistry } from "@/lib/demo/server";
import { canSeeClass, classStats, listAlerts, listClasses, listStudents, MIN_GROUP } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/components/ui/cn";
import { DemoStepFooter, DemoStepHeader } from "../DemoChrome";
import { ProofRunner } from "./ProofRunner";

export const metadata: Metadata = { title: "Trình diễn: bí mật được giữ thế nào" };

/** Những gì GVCN mẫu của lớp 7A thấy, lấy bằng ĐÚNG các hàm của trang GVCN (lib/staff.ts, lib/class-pulse.ts). */
async function teacherLens(teacherId: string) {
  const teacher = await demoProfile(teacherId);
  if (!teacher) return null;
  const registry = await demoRegistry();
  const own = await listClasses(teacher);
  const mine = own[0];
  if (!mine || !registry) return null;
  const others = registry.classIds.filter((id) => id !== mine.id);
  const { data: otherNames } = await createAdminClient().from("classes").select("id, name").in("id", others);
  const [stats, pulse, alerts, otherAccess, otherStudents] = await Promise.all([
    classStats(teacher, mine.id),
    classPulse(teacher, mine.id),
    listAlerts(teacher, { classId: mine.id }),
    Promise.all(others.map((id) => canSeeClass(teacher, id))),
    Promise.all(others.map((id) => listStudents(teacher, id))),
  ]);
  return {
    teacher: teacher.nickname,
    className: mine.name,
    students: mine.studentCount,
    shownDays: stats?.week.filter((d) => d.enough).length ?? 0,
    hiddenDays: stats?.week.filter((d) => !d.enough).length ?? 0,
    participants: stats?.participants ?? 0,
    hiddenTopics: pulse?.worries.hiddenTopics ?? 0,
    shownTopics: pulse?.worries.shown.map((t) => `${t.label} (${t.students} bạn)`) ?? [],
    alerts: alerts.length,
    alertsHidden: alerts.filter((a) => a.contentHidden).length,
    others: (otherNames ?? []).map((c) => ({
      name: c.name as string,
      canSee: otherAccess[others.indexOf(c.id as string)],
      students: otherStudents[others.indexOf(c.id as string)].length,
    })),
  };
}

export default async function SecretPage() {
  await requireStaff(["admin"]);
  const [demo, registry] = await Promise.all([demoOn(), demoRegistry()]);
  const lens = registry ? await teacherLens(registry.showcase.teacher) : null;

  return (
    <div className="space-y-8">
      <DemoStepHeader slug="bi-mat" demo={demo} hasData={Boolean(registry)} />

      {registry && (
        <>
          <section aria-labelledby="proof-title" className="space-y-3 rounded-[var(--radius-card)] border border-line bg-surface p-5">
            <h2 id="proof-title" className="font-display text-2xl font-bold tracking-tight">
              Bạn A có đọc được dữ liệu của bạn B không?
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-muted">
              Máy chủ đặt cho bạn mẫu A một mật khẩu ngẫu nhiên, đăng nhập như một học sinh thật, rồi dùng đúng khóa công khai mà trình duyệt nào cũng có để
              gọi THẲNG cơ sở dữ liệu (bỏ qua giao diện app), cố đọc và sửa dữ liệu của bạn mẫu B. Xong thì đổi sang mật khẩu ngẫu nhiên khác. Bản chạy được
              bằng lệnh: <code>npm run proof:isolation</code>.
            </p>
            <ProofRunner />
          </section>

          {lens && (
            <section aria-labelledby="lens-title" className="space-y-3">
              <h2 id="lens-title" className="font-display text-2xl font-bold tracking-tight">
                Còn thầy cô thấy gì?
              </h2>
              <p className="text-sm text-muted">
                Số liệu dưới đây lấy bằng đúng các hàm của trang GVCN, chạy với tài khoản của {lens.teacher} (GVCN {lens.className}).
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                <Lens title="Chỉ số liệu chung của lớp" tone="bg-sky">
                  <li>
                    7 ngày qua: {lens.participants}/{lens.students} bạn check-in. Hiện {lens.shownDays} ngày, <strong>ẩn {lens.hiddenDays} ngày</strong> vì dưới{" "}
                    {MIN_GROUP} bạn.
                  </li>
                  <li>
                    Chuyện các bạn hay lo: {lens.shownTopics.length ? lens.shownTopics.join(", ") : "chưa đủ bạn để hiện"}
                    {lens.hiddenTopics > 0 && <> · <strong>ẩn {lens.hiddenTopics} chủ đề</strong> dưới {MIN_GROUP} bạn</>}.
                  </li>
                  <li>Không có trang nào cho GVCN đọc check-in, tin nhắn hay chuyện của riêng một bạn.</li>
                </Lens>
                <Lens title="Biết bạn nào cần quan tâm, không đọc nội dung" tone="bg-lilac">
                  <li>
                    {lens.alerts} cảnh báo của lớp: <strong>{lens.alertsHidden}/{lens.alerts} đã bị máy chủ bỏ nội dung</strong> trước khi gửi về trình
                    duyệt của GVCN.
                  </li>
                  <li>Tư vấn viên mới đọc được đoạn có vấn đề, để xử lý.</li>
                  <li>Email báo thầy cô không bao giờ kèm nội dung.</li>
                </Lens>
                <Lens title="Không xem được lớp của đồng nghiệp" tone="bg-peach">
                  {lens.others.map((o) => (
                    <li key={o.name}>
                      {o.name}: {o.canSee ? "XEM ĐƯỢC (sai)" : "bị từ chối"} · danh sách học sinh trả về {o.students} bạn
                    </li>
                  ))}
                  <li>Mỗi người chỉ thấy công cụ của vai trò mình (có test tự động).</li>
                </Lens>
              </div>
            </section>
          )}
        </>
      )}
      <DemoStepFooter slug="bi-mat" />
    </div>
  );
}

function Lens({ title, tone, children }: { title: string; tone: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-[var(--radius-card)] p-4", tone)}>
      <p className="font-display text-lg font-bold leading-tight">{title}</p>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-snug">{children}</ul>
    </div>
  );
}
