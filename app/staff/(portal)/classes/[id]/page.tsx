import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { resolveAvatars } from "@/lib/avatar-server";
import { getEmotion, GROUP_COLOR, GROUP_LABEL, type EmotionGroup } from "@/lib/emotions";
import { canResetStudentPassword, classStats, getClass, listAlerts, listStaff, listStudents, MIN_GROUP } from "@/lib/staff";
import { WeekChart } from "@/components/WeekChart";
import { ArrowLeft } from "@/components/ui/icons";
import { btn, card, pill } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { AlertCard } from "../../AlertCard";
import { ClassForm } from "../ClassForm";
import { isTestClass } from "@/lib/support-content-server";
import { ClassAdminActions } from "./ClassAdminActions";
import { StudentList } from "./StudentList";

export const metadata: Metadata = { title: "Lớp học" };

export default async function ClassDetailPage({ params }: PageProps<"/staff/classes/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const profile = await requireStaff();
  const cls = await getClass(profile, id);
  if (!cls) notFound();

  const isAdmin = profile.role === "admin";
  const [stats, students, alerts, staff, canReset] = await Promise.all([
    classStats(profile, id),
    listStudents(profile, id),
    listAlerts(profile, { classId: id, status: "open" }),
    isAdmin ? listStaff() : Promise.resolve([]),
    canResetStudentPassword(profile, id),
  ]);
  const teachers = staff.filter((s) => s.role === "teacher" && !s.locked_at).map((s) => ({ id: s.id, name: s.name }));

  return (
    <>
      <Link href="/staff/classes" className={cn(btn.ghost, "-ml-3 mb-2")}>
        <ArrowLeft size={18} /> Lớp học
      </Link>

      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className={pill}>{cls.grade ? `Khối ${cls.grade}` : "Lớp học"}</span>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">Lớp {cls.name}</h1>
          <p className="mt-1 text-muted">
            GVCN: {cls.homeroom?.name ?? "chưa gán"} · {cls.studentCount} học sinh · báo khi nặng lòng {cls.negative_streak_days} ngày liền
          </p>
        </div>
        <div className="rounded-[var(--radius-card)] bg-butter px-5 py-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Mã lớp</p>
          <p className="font-mono text-3xl font-extrabold tracking-[0.2em]">{cls.code}</p>
        </div>
      </header>

      {alerts.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 font-display text-2xl font-bold tracking-tight">Cảnh báo chưa xong</h2>
          <div className="space-y-3">
            {alerts.map((a) => (
              <AlertCard key={a.id} alert={a} />
            ))}
          </div>
        </section>
      )}

      {stats && (
        <section className={`${card} mb-10`}>
          <h2 className="font-display text-2xl font-bold tracking-tight">Cảm xúc chung của lớp</h2>
          <p className="mb-5 text-sm text-muted">
            7 ngày qua · {stats.participants}/{stats.totalStudents} học sinh có check-in · số liệu ẩn danh, không gắn với
            em nào
          </p>
          {stats.enough ? (
            <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <WeekChart data={stats.week} />
                <p className="mt-2 text-xs text-muted">
                  Ngày có ít hơn {MIN_GROUP} học sinh check-in được để trống để giữ ẩn danh.
                </p>
              </div>
              <div>
                <GroupShare groups={stats.groups} />
                <p className="mb-2 mt-6 text-sm font-semibold">Cảm xúc được chọn nhiều nhất</p>
                <ul className="flex flex-wrap gap-2">
                  {stats.top.map(({ id: eid, count }) => {
                    const e = getEmotion(eid);
                    return e ? (
                      <li key={eid} className="rounded-full px-3 py-1.5 text-sm" style={{ backgroundColor: `${e.color}30` }}>
                        {e.emoji} {e.label} <span className="font-semibold">×{count}</span>
                      </li>
                    ) : null;
                  })}
                </ul>
              </div>
            </div>
          ) : (
            <p className="rounded-2xl bg-surface-2 p-6 text-center text-sm text-muted">
              Cần ít nhất {MIN_GROUP} học sinh check-in trong 7 ngày qua mới hiện thống kê, để không ai bị nhận ra.
            </p>
          )}
        </section>
      )}

      <section className="mb-10">
        <h2 className="mb-1 font-display text-2xl font-bold tracking-tight">Học sinh</h2>
        <p className="mb-4 text-sm text-muted">
          Chỉ có thông tin tài khoản. Thầy cô không xem được check-in, trò chuyện hay thói quen của từng em.
        </p>
        <StudentList students={students} avatars={await resolveAvatars(students.map((s) => s.avatar))} canReset={canReset} isAdmin={isAdmin} />
      </section>

      {isAdmin && (
        <section className={card}>
          <h2 className="mb-4 font-display text-xl font-bold tracking-tight">Cài đặt lớp</h2>
          <ClassForm
            classId={cls.id}
            teachers={teachers}
            initial={{
              name: cls.name,
              grade: cls.grade ? String(cls.grade) : "",
              negative_streak_days: String(cls.negative_streak_days),
              homeroom_teacher_id: cls.homeroom?.id ?? "",
            }}
          />
          <div className="mt-6 border-t border-line pt-5">
            <ClassAdminActions classId={cls.id} name={cls.name} hasStudents={cls.studentCount > 0} isTest={await isTestClass(cls.id)} />
          </div>
        </section>
      )}
    </>
  );
}

/** Thanh tỉ lệ 3 nhóm cảm xúc trong 7 ngày, kèm số liệu bằng chữ. */
function GroupShare({ groups }: { groups: Record<EmotionGroup, number> }) {
  const order: EmotionGroup[] = ["positive", "neutral", "negative"];
  const total = order.reduce((s, g) => s + groups[g], 0) || 1;
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">Tỉ lệ nhóm cảm xúc</p>
      <div className="flex h-4 gap-0.5 overflow-hidden rounded-full">
        {order
          .filter((g) => groups[g] > 0)
          .map((g) => (
            <span key={g} style={{ flexGrow: groups[g], background: GROUP_COLOR[g] }} />
          ))}
      </div>
      <ul className="mt-3 space-y-1 text-sm">
        {order.map((g) => (
          <li key={g} className="flex items-center gap-2">
            <span className="size-2.5 rounded-sm" style={{ background: GROUP_COLOR[g] }} />
            <span className="text-muted">{GROUP_LABEL[g]}</span>
            <span className="ml-auto font-semibold tabular-nums">{Math.round((groups[g] / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
