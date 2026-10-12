import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { getMoodByDay } from "@/lib/checkins";
import { addDays, dayKey, weekdayLabel } from "@/lib/dates";
import { getEmotion } from "@/lib/emotions";
import { getMemories, getOpenConcerns } from "@/lib/may-memory";
import { getRecentReflections } from "@/lib/reflection";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { RoundArrow } from "@/components/ui/ArrowLink";
import { resolveAvatar } from "@/lib/avatar-server";
import { PageHeader } from "@/components/PageHeader";
import { SupportCard } from "@/components/SupportCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { card } from "@/components/ui/styles";
import { ChangePasswordForm, DeleteAccount, SignOutButton } from "./AccountSettings";
import { MoodCalendar } from "./MoodCalendar";
import { WeekChart, type WeekDatum } from "@/components/WeekChart";

export const metadata: Metadata = { title: "Tôi" };

export default async function MePage({ searchParams }: PageProps<"/me">) {
  const profile = await requireProfile();
  const today = dayKey();
  const { thang } = await searchParams;
  const month =
    typeof thang === "string" && /^\d{4}-\d{2}$/.test(thang) && thang <= today.slice(0, 7)
      ? thang
      : today.slice(0, 7);

  const monthStart = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const monthEnd = addDays(monthStart, new Date(Date.UTC(y, m, 0)).getUTCDate() - 1);
  const weekStart = addDays(today, -6);

  const supabase = await createClient();
  const [monthMoods, weekMoods, cls, { count: totalCheckins }, reflections, memories, concerns] = await Promise.all([
    getMoodByDay(profile.id, monthStart, monthEnd),
    getMoodByDay(profile.id, weekStart, today),
    profile.class_id
      ? supabase.from("classes").select("name").eq("id", profile.class_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("checkins").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
    getRecentReflections(profile.id),
    getMemories(profile.id),
    getOpenConcerns(profile.id),
  ]);
  const avatar = await resolveAvatar(profile.avatar);

  const week: WeekDatum[] = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    const counts = { positive: 0, neutral: 0, negative: 0 };
    for (const id of weekMoods.get(day)?.emotions ?? []) {
      const e = getEmotion(id);
      if (e) counts[e.group] += 1;
    }
    return { day, label: day === today ? "Nay" : weekdayLabel(day), ...counts };
  });

  return (
    <div className="fm-stagger space-y-4">
      <PageHeader eyebrow="Góc riêng của bạn" title="Tôi" />

      <Link
        href="/me/ho-so"
        data-cursor-label="Sửa hồ sơ"
        className="group flex items-center gap-4 rounded-[var(--radius-card)] bg-lilac p-5 transition duration-500 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(60,40,10,0.45)]"
      >
        <Avatar avatar={avatar} size={72} className="ring-4 ring-surface/80" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-2xl font-extrabold tracking-tight">{profile.nickname}</p>
          <p className="text-sm text-muted">
            {cls.data?.name ? `Lớp ${cls.data.name} · ` : ""}
            {totalCheckins ?? 0} lần check-in
          </p>
          <p className="mt-1 text-[11px] font-extrabold uppercase tracking-[0.14em]">Đổi ảnh, biệt danh</p>
        </div>
        <RoundArrow />
      </Link>

      <section className={card}>
        <h2 className="mb-4 font-display text-xl font-bold tracking-tight">Lịch cảm xúc</h2>
        <MoodCalendar month={month} today={today} moods={monthMoods} />
      </section>

      <section className={card}>
        <h2 className="font-display text-xl font-bold tracking-tight">7 ngày qua</h2>
        <p className="mb-4 text-sm text-muted">Số lần bạn chọn mỗi nhóm cảm xúc</p>
        <WeekChart data={week} />
      </section>

      {reflections.length > 0 && (
        <section className={card}>
          <h2 className="font-display text-xl font-bold tracking-tight">Suy ngẫm gần đây</h2>
          <p className="mb-4 text-sm text-muted">Chỉ mình bạn đọc được.</p>
          <ul className="space-y-3">
            {reflections.map((r) => (
              <li key={r.id} className="rounded-2xl bg-lilac p-4">
                <p className="text-xs font-semibold text-muted">
                  {r.day.split("-").reverse().join("/")} · {r.question_text}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{r.answer}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link
        href="/me/ghi-nho"
        data-cursor-label="Xem"
        className="group flex items-center gap-4 rounded-[var(--radius-card)] bg-butter p-5 transition duration-500 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(60,40,10,0.45)]"
      >
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-surface/70 text-2xl" aria-hidden>
          📌
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-bold tracking-tight">Những điều Mây ghi nhớ về bạn</p>
          <p className="text-sm text-muted">
            {memories.length} điều Mây nhớ · {concerns.length} điều bận lòng · xem, sửa hoặc xóa
          </p>
        </div>
        <RoundArrow />
      </Link>

      <SupportCard />

      <section className={`${card} space-y-6`}>
        <div>
          <h2 className="mb-3 font-display text-xl font-bold tracking-tight">Giao diện</h2>
          <ThemeToggle />
        </div>
        <div>
          <h2 className="mb-3 font-display text-xl font-bold tracking-tight">Đổi mật khẩu</h2>
          <ChangePasswordForm />
        </div>
        <div>
          <h2 className="mb-1 font-display text-xl font-bold tracking-tight">Quyền riêng tư</h2>
          <p className="mb-2 text-sm text-muted">
            Thầy cô không đọc được check-in, trò chuyện hay thói quen của bạn. Chỉ khi có dấu hiệu
            nguy hiểm, thầy cô phụ trách mới nhận được đoạn đáng lo đó. F-Mood là công cụ hỗ trợ,
            không phải chuyên gia tâm lý.
          </p>
          <DeleteAccount />
        </div>
        <SignOutButton />
      </section>
    </div>
  );
}
