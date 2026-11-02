"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { startPractice } from "@/app/actions/practice";
import { roleplayOf } from "@/lib/practice/roleplay";
import { LIMITS } from "@/lib/practice/shared";
import type { SkillId } from "@/lib/skills";
import { MascotArt } from "@/components/mascot/MascotArt";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { bubble, chunkyWhite } from "../vui";
import { CrisisNotice, type SupportCards } from "../CrisisNotice";

type CaseItem = {
  code: string;
  sign: string;
  title: string | null;
  situation: string;
};
type From = "chat" | "library" | "journal" | "checkin" | "skills" | "home";

/**
 * Chọn tình huống để mở bài luyện (kế hoạch V2 mục 2.4, phản hồi II.2):
 * "Thử với tình huống mẫu" lên trước và dễ bấm nhất; "Dùng tình huống của mình" là tự nguyện, không cần kể chuyện riêng.
 * Vào từ trò chuyện: ô tình huống riêng để TRỐNG (không chép lời chat, không điền sẵn điều gì).
 * Giao diện vui (Duy duyệt mẫu 02/11): nhân vật vẫy tay mời chọn, thẻ tình huống trắng bóng mềm, màu theo nhóm năng lực
 * (trang bọc class tone-N nên bg-tint / text-tink / ring-tmid là màu của nhóm).
 */
export function SkillStart({
  skill,
  cases,
  from,
  nickname,
  supportCards,
}: {
  skill: SkillId;
  cases: CaseItem[];
  from: From;
  /** tên học sinh, để nhân vật gọi tên trong bong bóng thoại */
  nickname: string;
  supportCards: SupportCards;
}) {
  const router = useRouter();
  const [own, setOwn] = useState("");
  const [showOwn, setShowOwn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crisis, setCrisis] = useState<{
    text: string;
    notified: boolean;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const [picked, setPicked] = useState<string | null>(null);

  function start(choice: { caseCode?: string; ownSituation?: string }) {
    setError(null);
    setPicked(choice.caseCode ?? "own");
    startTransition(async () => {
      const res = await startPractice({ subskill: skill, from, ...choice });
      if (res.ok) router.push(`/luyen/bai/${res.id}`);
      else if ("crisis" in res) setCrisis(res.crisis);
      else setError(res.error);
    });
  }

  if (crisis) return <CrisisNotice text={crisis.text} notified={crisis.notified} cards={supportCards} />;

  return (
    <div className="space-y-5">
      {error && (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
      {from === "chat" && (
        <p className="rounded-2xl bg-sky px-4 py-3 text-sm text-sky-ink">
          Bạn đến từ cuộc trò chuyện. Lời chat không được chép vào bài luyện; bạn chọn tình huống ở dưới.
        </p>
      )}

      <div className={cn(bubble.wrap, "pt-1")}>
        <MascotArt size={84} className="-mb-1 max-sm:h-[84px] max-sm:w-[70px]" />
        <div className={bubble.box}>
          <p className={bubble.title}>Chọn một chuyện để luyện nè, {nickname}!</p>
          <p className={bubble.text}>Đây là chuyện của một bạn khác, bạn không cần kể chuyện riêng đâu. Bấm vào thẻ nào thấy giống mình nhất nhé.</p>
        </div>
      </div>

      <section aria-labelledby="tinh-huong-mau">
        <h2 id="tinh-huong-mau" className="font-display text-[22px] font-extrabold leading-tight">
          Thử với tình huống mẫu
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {cases.map((c, i) => (
            <li key={c.code}>
              <button
                type="button"
                disabled={pending}
                onClick={() => start({ caseCode: c.code })}
                className="group flex h-full min-h-16 w-full flex-col gap-2 rounded-3xl bg-surface p-4 text-left shadow-soft transition hover:-translate-y-[3px] hover:-rotate-[0.5deg] hover:ring-[3px] hover:ring-tmid focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/60 disabled:opacity-60 motion-reduce:transform-none dark:border dark:border-line"
              >
                <span className="flex items-center gap-3">
                  <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-[17px] bg-tint font-display text-xl font-extrabold text-tink">
                    {i + 1}
                  </span>
                  {/* thẻ có tên (tình huống Duy soạn): tên đậm, chữ tình huống nhỏ hơn; không có tên: nhãn biểu hiện */}
                  {c.title ? (
                    <span className="font-display text-[19px] font-bold leading-tight">{c.title}</span>
                  ) : (
                    <span className="text-xs font-bold uppercase tracking-wide text-tink">{c.sign}</span>
                  )}
                </span>
                <span className={cn("leading-relaxed", c.title ? "text-sm text-muted" : "font-medium")}>{c.situation}</span>
                <span className="mt-auto flex items-center justify-between pt-1">
                  <span className="text-[13px] font-bold text-tink">
                    Chọn chuyện này
                    {pending && picked === c.code && <span className="font-medium text-muted"> · Đang mở…</span>}
                  </span>
                  <span
                    aria-hidden
                    className="grid size-[34px] place-items-center rounded-full bg-brand font-extrabold text-brand-ink shadow-[0_2px_0_var(--brand-edge)] transition group-hover:translate-x-0.5 motion-reduce:transform-none"
                  >
                    →
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="cua-minh" className="rounded-[26px] border-2 border-dashed border-brand-edge/35 bg-brand-soft p-4 sm:px-5">
        <h2 id="cua-minh" className="flex flex-wrap items-center gap-x-2 gap-y-1 font-display text-[19px] font-extrabold">
          <span>
            <span aria-hidden>✍️ </span>Dùng tình huống của mình
          </span>
          <span className="whitespace-nowrap rounded-full bg-surface px-2.5 py-0.5 font-sans text-xs font-bold text-brand-strong dark:text-brand">tùy bạn</span>
        </h2>
        <p className="mt-1 text-sm text-muted">Không cần kể chuyện riêng. Nếu muốn, viết ngắn một chuyện học tập đang làm bạn khó.</p>
        {/* vai bạn cùng lớp chỉ dùng tình huống mẫu (Duy quyết 01/11): nói trước để học sinh chọn */}
        {roleplayOf(skill)?.kind === "peer" && (
          <p className="mt-1 text-sm text-muted">Phần tập nói với bạn trong vai chỉ có khi bạn chọn tình huống mẫu ở trên.</p>
        )}
        {showOwn ? (
          <>
            <label htmlFor="own-situation" className="sr-only">
              Tình huống của mình
            </label>
            <textarea
              id="own-situation"
              value={own}
              onChange={(e) => setOwn(e.target.value)}
              maxLength={LIMITS.situation}
              rows={3}
              placeholder="Ví dụ: thứ Sáu kiểm tra Lý mà mình còn 2 bài chưa hiểu"
              className="mt-3 block min-h-[86px] w-full resize-y rounded-[18px] border-2 border-brand-edge/25 bg-surface px-3.5 py-3 text-base text-ink outline-none transition placeholder:text-muted focus:border-brand-edge focus:ring-4 focus:ring-brand/30"
            />
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <button
                type="button"
                disabled={pending || own.trim().length < 4}
                onClick={() => start({ ownSituation: own })}
                className={cn(btn.primary, "max-sm:w-full")}
              >
                {pending && picked === "own" ? "Đang mở…" : "Luyện với tình huống này →"}
              </button>
              <span className="text-xs text-muted">
                {own.length}/{LIMITS.situation}
              </span>
            </div>
          </>
        ) : (
          <button type="button" onClick={() => setShowOwn(true)} className={cn(chunkyWhite, "mt-3")}>
            Viết tình huống của mình
          </button>
        )}
      </section>
    </div>
  );
}
