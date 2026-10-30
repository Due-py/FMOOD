import type { Metadata } from "next";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { SupportCard } from "@/components/SupportCard";
import { myHelpRequests } from "@/lib/help-requests";
import { createAdminClient } from "@/lib/supabase/admin";
import { contentForProfile } from "@/lib/support-content-server";
import { actionsDoneFor, difficultiesOf } from "@/lib/worries";
import { HelpRequest } from "./HelpRequest";
import { TalkRequest } from "./TalkRequest";

export const metadata: Metadata = { title: "Cần giúp ngay" };

/**
 * Trang luôn mở được từ nút "Cần giúp" ở mọi trang: số gọi khẩn cấp + báo thầy cô + lời nhờ không gấp.
 * Mở từ một chuyện bận lòng (?chuyen=…) thì lời nhờ được điền sẵn khó khăn đã xác nhận và việc đã thử (sửa được).
 */
export default async function HelpPage({ searchParams }: PageProps<"/giup-do">) {
  const profile = await requireProfile();
  const { chuyen } = await searchParams;
  const worryId = typeof chuyen === "string" && z.uuid().safeParse(chuyen).success ? chuyen : null;

  const prefill = { difficulty: "", tried: "" };
  if (worryId) {
    const { data } = await createAdminClient().from("worries").select("id").eq("id", worryId).eq("user_id", profile.id).maybeSingle();
    if (data) {
      const [difficulties, done, actions] = await Promise.all([
        difficultiesOf(profile.id, [worryId]),
        actionsDoneFor(profile.id, worryId),
        contentForProfile(profile, ["tiny_action"]),
      ]);
      prefill.difficulty = difficulties.get(worryId) ?? "";
      const titles = done.map((k) => actions.find((a) => a.key === k)?.data.title).filter((t): t is string => typeof t === "string");
      if (titles.length) prefill.tried = titles.slice(0, 2).join(", ").slice(0, 200);
    }
  }
  const waiting = (await myHelpRequests(profile)).filter((r) => r.status === "new");

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <header className="fm-rise">
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Cần người giúp ngay?</h1>
        <p className="mt-2 text-muted">
          Nếu bạn hoặc bạn bè đang gặp nguy hiểm, hãy gọi <strong className="text-ink">115</strong> hoặc nói ngay với
          người lớn gần nhất. Bạn không phải tự mình vượt qua chuyện này.
        </p>
      </header>
      <SupportCard tone="urgent" helpLink={false} />
      <HelpRequest />
      <TalkRequest hasClass={Boolean(profile.class_id)} prefill={prefill} waiting={waiting} />
    </div>
  );
}
