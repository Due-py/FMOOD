import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { assistantName } from "@/lib/assistant";
import { getMoodByDay } from "@/lib/checkins";
import { addDays, dayKey, weekdayLabel } from "@/lib/dates";
import { getEmotion } from "@/lib/emotions";
import { getChatPreferences } from "@/lib/personalize";
import { createClient } from "@/lib/supabase/server";
import { contentForProfile } from "@/lib/support-content-server";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { RoundArrow } from "@/components/ui/ArrowLink";
import { resolveAvatar } from "@/lib/avatar-server";
import { PageHeader } from "@/components/PageHeader";
import { SupportCard } from "@/components/SupportCard";
import { btn, card } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { SettingsIcon } from "@/components/ui/icons";
import { ChatMemory } from "./ChatMemory";
import { SignOutButton } from "./AccountSettings";
import { MoodCalendar } from "./MoodCalendar";
import { WeekChart, type WeekDatum } from "@/components/WeekChart";

export const metadata: Metadata = { title: "Tôi" };

export default async function MePage({ searchParams }: PageProps<"/me">) {
  const profile = await requireProfile();
  const today = dayKey();
  const { thang } = await searchParams;
  const name = await assistantName();
  const month =
    typeof thang === "string" && /^\d{4}-\d{2}$/.test(thang) && thang <= today.slice(0, 7)
      ? thang
      : today.slice(0, 7);

  const monthStart = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const monthEnd = addDays(monthStart, new Date(Date.UTC(y, m, 0)).getUTCDate() - 1);
  const weekStart = addDays(today, -6);

  const supabase = await createClient();
  const [monthMoods, weekMoods, cls, { count: totalCheckins }, prefs, loopTopics] = await Promise.all([
    getMoodByDay(profile.id, monthStart, monthEnd),
    getMoodByDay(profile.id, weekStart, today),
    profile.class_id
      ? supabase.from("classes").select("name").eq("id", profile.class_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("checkins").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
    getChatPreferences(profile.id),
    contentForProfile(profile, ["topic"]),
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
      <PageHeader
        eyebrow="Góc riêng của bạn"
        title="Tôi"
        action={
          <Link href="/me/cai-dat" className={cn(btn.secondary, "px-4")}>
            <SettingsIcon size={18} /> Cài đặt
          </Link>
        }
      />

      <Link
        href="/me/ho-so"
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

      {loopTopics.length > 0 && (
        <Link
          href="/hanh-trinh"
          className="group flex items-center gap-4 rounded-[var(--radius-card)] bg-mint p-5 transition duration-500 hover:-translate-y-0.5"
        >
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-surface/70 text-3xl" aria-hidden>
            🧭
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-xl font-bold tracking-tight">Hành trình của mình</span>
            <span className="block text-sm text-muted">Chuyện bận lòng, việc nhỏ đã thử và huy hiệu của bạn.</span>
          </span>
          <RoundArrow />
        </Link>
      )}

      <section className={card}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold tracking-tight">Lịch cảm xúc</h2>
          <Link href="/tam-trang" className={cn(btn.secondary, "px-4 text-sm")}>
            📈 Biểu đồ tâm trạng
          </Link>
        </div>
        <MoodCalendar month={month} today={today} moods={monthMoods} />
      </section>

      <section className={card}>
        <h2 className="font-display text-xl font-bold tracking-tight">7 ngày qua</h2>
        <p className="mb-4 text-sm text-muted">Số lần bạn chọn mỗi nhóm cảm xúc</p>
        <WeekChart data={week} />
      </section>

      <section className={card}>
        <h2 className="font-display text-xl font-bold tracking-tight">{name} đang ghi nhớ</h2>
        <p className="mb-3 text-sm text-muted">{name} điều chỉnh cách trò chuyện theo phản hồi 👍/👎 của riêng bạn.</p>
        <ChatMemory reasons={prefs.reasons} ups={prefs.ups} downs={prefs.downs} />
      </section>

      <SupportCard />

      <SignOutButton />
    </div>
  );
}
