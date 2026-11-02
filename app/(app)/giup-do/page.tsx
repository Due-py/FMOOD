import type { Metadata } from "next";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { MascotArt } from "@/components/mascot/MascotArt";
import { myHelpRequests } from "@/lib/help-requests";
import { prefillFromLesson, prefillFromPractice } from "@/lib/help-requests-shared";
import { getLesson } from "@/lib/lessons";
import { loadSession } from "@/lib/practice/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { contentForProfile } from "@/lib/support-content-server";
import { actionsDoneFor, difficultiesOf } from "@/lib/worries";
import { HelpRequest } from "./HelpRequest";
import { TalkRequest } from "./TalkRequest";
import { UrgentContacts } from "./UrgentContacts";

export const metadata: Metadata = { title: "Cần giúp ngay" };

/**
 * Trang luôn mở được từ nút "Cần giúp" ở mọi trang: số gọi khẩn cấp + báo thầy cô + lời nhờ không gấp.
 * Mở từ một chuyện bận lòng (?chuyen=…) thì lời nhờ được điền sẵn khó khăn đã xác nhận và việc đã thử (sửa được).
 * Mở từ bài luyện "Mở lời nhờ người giúp" (?luyen=…) thì điền sẵn từ bài làm của chính học sinh; từ bài tập Thư viện (?bai=…) thì điền tên bài.
 * Giao diện vui nhưng nghiêm túc (mẫu can-giup.html): hai cột từ 1280px: "Cần ngay bây giờ" (số gọi, 115 nút đỏ; báo thầy cô)
 * và "Không gấp" (lời nhờ). Nhân vật chỉ nhỏ ở đầu trang, không đùa; màu đỏ chỉ cho việc gấp.
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
  // bài luyện "Mở lời nhờ người giúp" của CHÍNH học sinh này: lấy bài làm mới nhất (lần 2 nếu có)
  if (!worryId && typeof luyen === "string" && z.uuid().safeParse(luyen).success) {
    const loaded = await loadSession(profile.id, luyen);
    if (loaded && loaded !== "missing" && loaded.session.skill === "ask_for_help") {
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
    <div className="relative isolate">
      <span aria-hidden className="pointer-events-none absolute -top-8 right-0 -z-10 size-56 rounded-full bg-danger-soft opacity-60 sm:size-64" />

      <header className="fm-rise flex items-start gap-3 rounded-[1.75rem] bg-surface p-4 shadow-soft sm:items-center sm:gap-4 sm:px-6 sm:py-5 dark:border dark:border-line">
        <span aria-hidden className="shrink-0">
          <MascotArt size={44} className="mt-0.5 sm:hidden" />
          <MascotArt size={64} className="hidden sm:block" />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-[1.6rem] font-extrabold leading-tight tracking-tight sm:text-[2rem]">Cần người giúp ngay?</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted sm:text-[15px]">
            Nếu bạn hoặc bạn bè đang gặp nguy hiểm, hãy gọi{" "}
            <strong className="rounded-lg bg-danger-soft px-1.5 font-extrabold text-danger">115</strong> hoặc nói ngay với người lớn gần
            nhất. Bạn không phải tự mình vượt qua chuyện này.
          </p>
        </div>
      </header>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        {/* cột gấp: số gọi + báo thầy cô ngay */}
        <div className="space-y-4">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-3 py-1 text-xs font-extrabold tracking-wide text-danger">
            <span aria-hidden>⚡</span> CẦN NGAY BÂY GIỜ
          </p>
          <UrgentContacts />
          <HelpRequest />
        </div>

        {/* cột không gấp: lời nhờ thầy cô */}
        <div className="space-y-4">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-c1 px-3 py-1 text-xs font-extrabold tracking-wide text-c1-ink">
            <span aria-hidden>🌿</span> KHÔNG GẤP
          </p>
          <TalkRequest hasClass={Boolean(profile.class_id)} prefill={prefill} waiting={waiting} selfAsk={selfAsk === "1"} />
        </div>
      </div>
    </div>
  );
}
