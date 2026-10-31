import type { Metadata } from "next";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { SupportCard } from "@/components/SupportCard";
import { myHelpRequests } from "@/lib/help-requests";
import { prefillFromLesson, prefillFromPractice } from "@/lib/help-requests-shared";
import { getLesson } from "@/lib/lessons";
import { loadSession } from "@/lib/practice/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { contentForProfile } from "@/lib/support-content-server";
import { actionsDoneFor, difficultiesOf } from "@/lib/worries";
import { HelpRequest } from "./HelpRequest";
import { TalkRequest } from "./TalkRequest";

export const metadata: Metadata = { title: "Cần giúp ngay" };

/**
 * Trang luôn mở được từ nút "Cần giúp" ở mọi trang: số gọi khẩn cấp + báo thầy cô + lời nhờ không gấp.
 * Mở từ một chuyện bận lòng (?chuyen=…) thì lời nhờ được điền sẵn khó khăn đã xác nhận và việc đã thử (sửa được).
 * Mở từ bài luyện K4 (?luyen=…) thì điền sẵn từ bài làm của chính học sinh; từ bài tập Thư viện (?bai=…) thì điền tên bài.
 * ?tu-hoi=1: chọn sẵn "Thầy cô bộ môn (tự hỏi)", soạn để tự hỏi, không gửi qua hệ thống (mục 5.1).
 */
export default async function HelpPage({ searchParams }: PageProps<"/giup-do">) {
  const profile = await requireProfile();
  const { chuyen, luyen, bai, "tu-hoi": selfAsk } = await searchParams;
  const worryId = typeof chuyen === "string" && z.uuid().safeParse(chuyen).success ? chuyen : null;

  const prefill = { difficulty: "", tried: "", want: "" };
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
  // bài luyện K4 của CHÍNH học sinh này: lấy bài làm mới nhất (lần 2 nếu có)
  if (!worryId && typeof luyen === "string" && z.uuid().safeParse(luyen).success) {
    const loaded = await loadSession(profile.id, luyen);
    if (loaded && loaded !== "missing" && loaded.session.skill === "K4") {
      const latest = [...loaded.attempts].sort((a, b) => b.version - a.version)[0];
      Object.assign(prefill, prefillFromPractice(latest?.answers));
    }
  }
  // bài tập trong Thư viện (nút "Nhờ thầy cô"): chỉ điền tên bài, không tạo cảnh báo (mục 5.2)
  if (!worryId && typeof bai === "string" && bai.length <= 120) {
    const lesson = await getLesson(bai);
    if (lesson) Object.assign(prefill, prefillFromLesson(lesson.title));
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
      <TalkRequest hasClass={Boolean(profile.class_id)} prefill={prefill} waiting={waiting} selfAsk={selfAsk === "1"} />
    </div>
  );
}
