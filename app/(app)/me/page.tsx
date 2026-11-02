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
import { resolveAvatar } from "@/lib/avatar-server";
import { SupportCard } from "@/components/SupportCard";
import { cn } from "@/components/ui/cn";
import { SettingsIcon } from "@/components/ui/icons";
import { MascotArt } from "@/components/mascot/MascotArt";
import { ChatMemory } from "./ChatMemory";
import { btnWhite, MeBox } from "./MeBox";
import { SignOutButton } from "./AccountSettings";
import { MoodCalendar } from "./MoodCalendar";
import { WeekChart, type WeekDatum } from "@/components/WeekChart";

export const metadata: Metadata = { title: "Tôi" };

/**
 * TÔI: góc riêng của học sinh. Giao diện vui (mẫu toi.html, Duy duyệt 02/11): nhân vật vẫy tay cạnh bong bóng lời chào;
 * thẻ hồ sơ tím nhạt; lối sang Hành trình bạc hà; các hộp trắng bo tròn có ô biểu tượng màu; 7 ngày qua và Ghi nhớ đứng
 * cạnh nhau trên màn rộng. Hồ sơ và Cài đặt vẫn là hai trang riêng (/me/ho-so, /me/cai-dat).
 */
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
    <div className="relative isolate fm-stagger space-y-4">
      {/* đốm màu trang trí, nằm trong khung để không sinh thanh cuộn ngang */}
      <span aria-hidden className="pointer-events-none absolute -top-8 right-0 -z-10 size-56 rounded-full bg-c1 opacity-50 sm:size-64" />

      <header className="flex flex-wrap items-end gap-x-1 gap-y-2">
        <MascotArt size={88} className="-mb-1 hidden sm:block" />
        <MascotArt size={64} className="-mb-1 sm:hidden" />
        <div className="mb-4 min-w-0 flex-[1_1_12rem] rounded-[1.4rem] rounded-bl-md bg-surface px-4 py-3 shadow-soft sm:mb-5 sm:px-5">
          <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-[1.75rem]">
            Góc riêng của {profile.nickname} nè
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            Chỗ này chỉ của bạn: cảm xúc mỗi ngày, điều {name} ghi nhớ, và người có thể giúp bạn.
          </p>
        </div>
        <Link href="/me/cai-dat" className={cn(btnWhite, "mb-4 ml-auto sm:mb-7 sm:ml-2")}>
          <SettingsIcon size={18} /> Cài đặt
        </Link>
      </header>

      <Link
        href="/me/ho-so"
        className="tone-1 flex items-center gap-4 rounded-[1.75rem] bg-tint p-4 transition duration-200 hover:-translate-y-0.5 hover:-rotate-[0.4deg] motion-reduce:transition-none motion-reduce:hover:transform-none sm:gap-5 sm:px-5 sm:py-[1.125rem]"
      >
        <Avatar avatar={avatar} size={76} className="ring-[5px] ring-surface/60" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[1.65rem] font-extrabold leading-tight tracking-tight sm:text-3xl">{profile.nickname}</p>
          <p className="mt-1 flex flex-wrap gap-1.5">
            {cls.data?.name && (
              <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold text-tink">🏫 Lớp {cls.data.name}</span>
            )}
            <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold text-tink">✅ {totalCheckins ?? 0} lần check-in</span>
          </p>
          <p className="mt-2 text-[13px] font-bold text-tink">✏️ Đổi ảnh, biệt danh</p>
        </div>
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-surface font-bold text-tink">
          →
        </span>
      </Link>

      {loopTopics.length > 0 && (
        <Link
          href="/hanh-trinh"
          className="tone-2 flex items-center gap-4 rounded-[1.75rem] bg-tint p-4 transition duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:transform-none sm:px-5"
        >
          <span aria-hidden className="grid size-14 shrink-0 -rotate-6 place-items-center rounded-[1.25rem] bg-surface text-3xl">
            🧭
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-xl font-extrabold leading-tight text-tink">Hành trình của mình</span>
            <span className="block text-[13px] text-muted">Chuyện bận lòng, việc nhỏ đã thử và huy hiệu của bạn.</span>
          </span>
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-surface font-bold text-tink">
            →
          </span>
        </Link>
      )}

      <MeBox
        id="lich-cam-xuc"
        icon="🗓️"
        tint="bg-c4"
        title="Lịch cảm xúc"
        sub="Mỗi ngày tô màu theo cảm xúc bạn chọn nhiều nhất."
        action={
          <Link href="/tam-trang" className={btnWhite}>
            📈 Biểu đồ tâm trạng
          </Link>
        }
      >
        <MoodCalendar month={month} today={today} moods={monthMoods} />
      </MeBox>

      <div className="grid gap-4 md:grid-cols-2">
        <MeBox id="bay-ngay" icon="📊" tint="bg-c2" title="7 ngày qua" sub="Số lần bạn chọn mỗi nhóm cảm xúc">
          <div className="mt-4">
            <WeekChart data={week} />
          </div>
        </MeBox>

        <MeBox
          id="ghi-nho"
          icon={<MascotArt size={30} />}
          tint="bg-c1"
          title={`${name} đang ghi nhớ`}
          sub={`${name} điều chỉnh cách trò chuyện theo phản hồi 👍/👎 của riêng bạn.`}
        >
          <div className="mt-3">
            <ChatMemory reasons={prefs.reasons} ups={prefs.ups} downs={prefs.downs} />
          </div>
        </MeBox>
      </div>

      <SupportCard />

      <SignOutButton />
    </div>
  );
}
