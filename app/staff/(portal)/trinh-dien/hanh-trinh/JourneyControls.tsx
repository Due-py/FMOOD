"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { answerAsDemo, fastForward, undoFastForward } from "@/app/actions/demo";
import { FollowupForm } from "@/app/(app)/home/FollowupCard";
import { CharacterAvatar } from "@/components/mascot/CharacterAvatar";
import { useAssistant } from "@/components/mascot/AssistantContext";
import { useUndo } from "@/components/staff/Undo";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import type { FollowupLoop } from "@/lib/loop-content";

export function StudentPicker({ students, current }: { students: { id: string; nickname: string; className: string | null }[]; current: string }) {
  const router = useRouter();
  const classes = [...new Set(students.map((s) => s.className ?? "Chưa có lớp"))];
  return (
    <label className="flex items-center gap-2 text-sm font-semibold">
      Xem bạn
      <select
        value={current}
        onChange={(e) => router.push(`/staff/trinh-dien/hanh-trinh?ban=${e.target.value}`)}
        className="rounded-full border border-line bg-surface px-4 py-2 font-semibold"
      >
        {classes.map((c) => (
          <optgroup key={c} label={c}>
            {students
              .filter((s) => (s.className ?? "Chưa có lớp") === c)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nickname}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

/** Nút "Tua nhanh": dời mốc thời gian của bạn MẪU này, có Hoàn tác. */
export function FastForward({ studentId, nickname }: { studentId: string; nickname: string }) {
  const router = useRouter();
  const offer = useUndo();
  const [pending, start] = useTransition();
  function go(days: number) {
    start(async () => {
      const res = await fastForward(studentId, days);
      if (!res.ok) {
        offer(res.error);
        return;
      }
      offer(`Đã tua ${days} ngày cho ${nickname}`, () => undoFastForward(studentId, days, res.at));
      router.refresh();
    });
  }
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={pending} onClick={() => go(7)} className={cn(btn.primary, "text-lg")}>
        {pending ? "Đang tua…" : "⏩ Tua nhanh 7 ngày"}
      </button>
      <button type="button" disabled={pending} onClick={() => go(1)} className={btn.secondary}>
        +1 ngày
      </button>
    </div>
  );
}

/** Màn hình trang chủ của bạn ấy, thu nhỏ trong khung điện thoại. */
export function PhonePreview({
  studentId,
  nickname,
  followup,
  nextCheck,
}: {
  studentId: string;
  nickname: string;
  followup: FollowupLoop | null;
  nextCheck: { label: string; emoji: string; at: string } | null;
}) {
  // khung điện thoại: nhân vật mặc định admin đặt (bạn mẫu chưa tự chọn nhân vật)
  const assistant = useAssistant();
  const router = useRouter();
  return (
    <div className="mx-auto w-full max-w-[340px] rounded-[2.6rem] border-[10px] border-ink bg-ink shadow-[0_30px_60px_-30px_rgba(0,0,0,0.55)]">
      <div className="relative overflow-hidden rounded-[1.9rem] bg-bg px-4 pb-6 pt-8">
        <span className="absolute left-1/2 top-2 h-5 w-24 -translate-x-1/2 rounded-full bg-ink" aria-hidden />
        <div className="flex items-end gap-2">
          <CharacterAvatar size={56} float={false} mood={followup ? "happy" : "calm"} />
          <div className="min-w-0">
            <p className="text-xs text-muted">Trang chủ của</p>
            <p className="truncate font-display text-xl font-extrabold">{nickname}</p>
          </div>
        </div>
        <div className="mt-4">
          {followup ? (
            <section aria-label={`${assistant.name} hỏi thăm`} className="rounded-[1.6rem] border-2 border-dashed border-ink/15 bg-sky p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold text-muted">
                <span aria-hidden>{assistant.emoji}</span> {assistant.name} hỏi thăm
              </p>
              <FollowupForm
                key={followup.worry.id}
                worry={followup.worry}
                ask={followup.ask}
                lines={followup.lines}
                badges={followup.badges}
                hasSteps={false}
                answer={(worryId, level, feeling, tried, triedAction) => answerAsDemo(studentId, worryId, level, feeling, tried, triedAction)}
                onFinished={() => router.refresh()}
              />
            </section>
          ) : (
            <div className="rounded-[1.6rem] bg-surface p-4 text-sm leading-relaxed">
              <p className="font-semibold">Hôm nay {assistant.name} chưa hỏi lại chuyện nào.</p>
              {nextCheck ? (
                <p className="mt-1 text-muted">
                  {nextCheck.emoji} Chuyện “{nextCheck.label}” sẽ được hỏi lại vào{" "}
                  <strong className="text-ink">{new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "numeric", month: "numeric" }).format(new Date(nextCheck.at))}</strong>
                  . Bấm Tua nhanh để tới ngày đó.
                </p>
              ) : (
                <p className="mt-1 text-muted">Bạn ấy không có chuyện nào đang chờ hỏi lại.</p>
              )}
            </div>
          )}
        </div>
        <div className="mt-3 rounded-[1.6rem] bg-brand p-4 text-brand-ink">
          <p className="text-xs font-semibold opacity-80">Check-in</p>
          <p className="font-display text-lg font-extrabold">Bạn đang thấy thế nào?</p>
        </div>
      </div>
    </div>
  );
}
