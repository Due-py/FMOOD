import type { Metadata } from "next";
import { SupportCard } from "@/components/SupportCard";
import { CheckinFlow } from "./CheckinFlow";

export const metadata: Metadata = { title: "Check-in cảm xúc" };

export default function CheckinPage() {
  return <CheckinFlow supportCard={<SupportCard teacherNotified />} />;
}
