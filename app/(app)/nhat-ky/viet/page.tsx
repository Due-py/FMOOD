import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { getMoodByDay } from "@/lib/checkins";
import { dayKey } from "@/lib/dates";
import { journalEntry, journalPrompts } from "@/lib/journal";
import { suggestPrompts } from "@/lib/journal-shared";
import { SupportCard } from "@/components/SupportCard";
import { JournalEditor } from "./JournalEditor";

export const metadata: Metadata = { title: "Viết nhật ký" };

/** Viết trang mới (chọn mẫu câu, gợi ý theo lần check-in hôm nay) hoặc sửa một trang đã viết (?id=). */
export default async function WriteJournalPage({ searchParams }: PageProps<"/nhat-ky/viet">) {
  const profile = await requireProfile();
  const { id, mau } = await searchParams;
  const editId = typeof id === "string" && z.uuid().safeParse(id).success ? id : null;
  const today = dayKey();
  const [{ ready, prompts }, entry, moods] = await Promise.all([
    journalPrompts(),
    editId ? journalEntry(profile.id, editId) : Promise.resolve(null),
    getMoodByDay(profile.id, today, today),
  ]);
  if (editId && !entry) notFound();
  if (!ready) notFound();

  const suggested = suggestPrompts(prompts, moods.get(today)?.emotions ?? null).map((p) => p.id);
  const initialPromptId = typeof mau === "string" && prompts.some((p) => p.id === mau) ? mau : null;

  return (
    <JournalEditor
      prompts={prompts}
      suggested={suggested}
      entry={entry}
      initialPromptId={initialPromptId}
      supportCards={{ urgent: <SupportCard tone="urgent" />, gentle: <SupportCard />, gentleNotified: <SupportCard teacherNotified /> }}
    />
  );
}
