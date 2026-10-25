import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { checkinLoop } from "@/lib/loop-content";
import { SupportCard } from "@/components/SupportCard";
import { CheckinFlow } from "./CheckinFlow";

export const metadata: Metadata = { title: "Check-in cảm xúc" };

export default async function CheckinPage() {
  const profile = await requireProfile();
  return <CheckinFlow supportCard={<SupportCard teacherNotified />} loop={await checkinLoop(profile)} />;
}
