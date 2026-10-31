import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { dayKey, formatTime } from "@/lib/dates";
import { getMoodByDay } from "@/lib/checkins";
import { checkinLoop } from "@/lib/loop-content";
import { SupportCard } from "@/components/SupportCard";
import { CheckinFlow } from "./CheckinFlow";

export const metadata: Metadata = { title: "Check-in cảm xúc" };

export default async function CheckinPage() {
  const profile = await requireProfile();
  const today = dayKey();
  const [loop, moods] = await Promise.all([checkinLoop(profile), getMoodByDay(profile.id, today, today)]);
  // đã ghi hôm nay: nhắc giờ lần gần nhất (lịch và các chỉ số tính theo lần gần nhất trong ngày)
  const mood = moods.get(today);
  const last = mood ? { time: formatTime(mood.at), emotions: mood.emotions, count: mood.count } : null;
  return <CheckinFlow supportCard={<SupportCard teacherNotified />} loop={loop} last={last} />;
}
