"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useState, useTransition } from "react";
import { deleteWorry } from "@/app/actions/worries";
import { TOPIC_TONE } from "@/app/(app)/checkin/WorryStep";
import { CloudStep, FollowupForm } from "@/app/(app)/home/FollowupCard";
import { DifficultyConfirm } from "@/components/DifficultyConfirm";
import { WeatherCloud } from "@/components/LevelPicker";
import { useAssistant } from "@/components/mascot/AssistantContext";
import { MascotArt } from "@/components/mascot/MascotArt";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { formatDate } from "@/lib/dates";
import type { JourneyLoop, JourneyWorry } from "@/lib/loop-content";
import { canAnswer, LEVEL_LABELS, TRIED_LABEL, type WorryStatus } from "@/lib/worries-shared";
import { Chevron, JourneyEmpty, JourneySection } from "./JourneySection";

const STATUS_LABEL: Record<WorryStatus, string> = {
  open: "Đang theo dõi",
  better: "Đã nhẹ lòng",
  done: "Đã xong",
  stale: "Lâu không cập nhật",
};

/** số mây nhỏ tối đa ở dòng chủ đề; còn lại ghi "+n" */
const CLOUDS = 3;

/** sắp chuyện đang theo dõi: chuyện sắp được hỏi lại trước, chuyện không còn lịch hỏi lại xuống cuối */
const byNextCheck = (a: JourneyWorry, b: JourneyWorry) => (a.nextCheckAt ?? "9999").localeCompare(b.nextCheckAt ?? "9999");

/** gom theo chủ đề, giữ thứ tự: chủ đề có chuyện sắp hỏi lại sớm nhất lên đầu */
function byTopic(worries: JourneyWorry[]): JourneyWorry[][] {
  const groups = new Map<string, JourneyWorry[]>();
  for (const w of worries) groups.set(w.topic, [...(groups.get(w.topic) ?? []), w]);
  return [...groups.values()];
}

/**
 * Chuyện bận lòng (Duy 01/11 tối: gom theo chủ đề vì 5 dòng "Học tập" liền nhau khó đọc): mỗi CHỦ ĐỀ một dòng (số
 * chuyện, ngày hỏi lại sớm nhất, mây hiện tại của từng chuyện); bấm mới hiện từng chuyện. Chủ đề chỉ có một chuyện thì
 * hiện thẳng dòng chuyện đó. Bấm dòng chuyện mới mở chi tiết: chuỗi mây đầy đủ, khó khăn đã xác nhận, Cập nhật / Ghi khó
 * khăn / Xóa. Chuyện đã qua gập lại sẵn. Cập nhật nhanh thì ở trang Hôm nay (thẻ hỏi lại đến hạn). Việc nhỏ đã thử, huy
 * hiệu nằm ở khối Mình đã làm được (Recognition), giọt nước ở ô Khu vườn.
 * Giao diện vui (mẫu hanh-trinh.html): mỗi chủ đề / chuyện là một thẻ trắng bóng mềm; chuyện trong chủ đề là thẻ kem lồng
 * bên trong; chuỗi mây nằm trên dải xanh trời; nhân vật nhỏ đứng cạnh lời hẹn hỏi lại; "Đã qua" là khung nét đứt.
 */
export function WorrySection({ loop }: { loop: JourneyLoop }) {
  const following = loop.worries.filter((w) => w.status === "open").sort(byNextCheck);
  const past = loop.worries.filter((w) => w.status !== "open");
  const note = [following.length && `${following.length} đang theo dõi`, past.length && `${past.length} đã qua`].filter(Boolean).join(" · ");

  return (
    <JourneySection id="chuyen-ban-long" emoji="☁️" title="Chuyện bận lòng" note={note || undefined}>
      {following.length ? (
        <ul className="grid gap-2.5">
          {byTopic(following).map((g) =>
            g.length === 1 ? <WorryRow key={g[0].id} worry={g[0]} loop={loop} /> : <TopicGroup key={g[0].topic} worries={g} loop={loop} />,
          )}
        </ul>
      ) : (
        <JourneyEmpty>
          Chưa có chuyện nào đang theo dõi.{" "}
          <Link href="/checkin" className="font-semibold text-brand-strong underline underline-offset-4 dark:text-brand">
            Check-in
          </Link>{" "}
          khi bạn muốn kể nhé.
        </JourneyEmpty>
      )}

      {past.length > 0 && (
        <details className="group mt-2.5 rounded-[1.4rem] border-2 border-dashed border-line bg-surface/60">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2.5 px-4 py-2 font-bold [&::-webkit-details-marker]:hidden">
            <span aria-hidden>🗂️</span>
            <span className="flex-1">Đã qua ({past.length})</span>
            <Chevron className="group-open:rotate-180" />
          </summary>
          <ul className="grid gap-2 px-2.5 pb-2.5">
            {past.map((w) => (
              <WorryRow key={w.id} worry={w} loop={loop} flat />
            ))}
          </ul>
        </details>
      )}
    </JourneySection>
  );
}

/** Một chủ đề có từ 2 chuyện đang theo dõi: một dòng tóm tắt; bấm để hiện từng chuyện bên trong. */
function TopicGroup({ worries, loop }: { worries: JourneyWorry[]; loop: JourneyLoop }) {
  const [expanded, setExpanded] = useState(false);
  const first = worries[0];
  const next = worries.find((w) => w.nextCheckAt)?.nextCheckAt ?? null;
  const panelId = `chu-de-${first.topic}`;
  const extra = worries.length - CLOUDS;

  return (
    <li className="overflow-hidden rounded-[1.4rem] bg-surface shadow-soft">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-surface-2/50 sm:gap-3 sm:px-3.5 sm:py-3"
      >
        <span aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-xl sm:size-11", TOPIC_TONE[first.topic] ?? "bg-surface-2")}>
          {first.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">{first.label}</span>
          <span className="block truncate text-[13px] text-muted">
            {worries.length} chuyện · {next ? `hỏi lại ${formatDate(next)}` : "tự cập nhật khi muốn"}
          </span>
        </span>
        {/* mây bây giờ của từng chuyện */}
        <span className="flex shrink-0 items-center text-muted" aria-label={`Bây giờ: ${worries.map((w) => LEVEL_LABELS[w.levelNow - 1]).join(", ")}.`}>
          {worries.slice(0, CLOUDS).map((w) => (
            <WeatherCloud key={w.id} level={w.levelNow} className="-ml-2 size-7 first:ml-0 sm:size-8" />
          ))}
          {extra > 0 && (
            <span aria-hidden className="ml-1 text-xs">
              +{extra}
            </span>
          )}
        </span>
        <Chevron open={expanded} />
      </button>
      {expanded && (
        <ul id={panelId} className="grid gap-2 px-2.5 pb-2.5">
          {worries.map((w) => (
            <WorryRow key={w.id} worry={w} loop={loop} grouped />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Một chuyện bận lòng: một dòng gọn; bấm để mở chuỗi mây, chi tiết và các nút. `grouped`: nằm trong dòng chủ đề nên bỏ
 * vòng tròn chủ đề và tên chủ đề, dòng chính là lời bạn ghi (nếu có) hoặc ngày kể (khi đó dòng phụ không nhắc lại ngày kể).
 * Thẻ: đứng riêng thì trắng bóng mềm; `grouped` thì kem lồng trong thẻ chủ đề; `flat` (trong "Đã qua") thì trắng không bóng.
 */
function WorryRow({ worry, loop, grouped = false, flat = false }: { worry: JourneyWorry; loop: JourneyLoop; grouped?: boolean; flat?: boolean }) {
  const { name } = useAssistant();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<"view" | "update" | "delete" | "difficulty">("view");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const open = worry.status === "open";
  const nextTime = worry.checks.findLast((c) => c.nextTime)?.nextTime ?? null;
  const panelId = `chuyen-${worry.id}`;
  // ô bên trong (khó khăn, lần sau sẽ chỉnh, form): trắng trên thẻ kem, kem trên thẻ trắng
  const inner = grouped ? "bg-surface" : "bg-surface-2";

  // dòng phụ ngắn: ngày kể · lịch hỏi lại (hoặc trạng thái với chuyện đã qua)
  const when = open ? (worry.nextCheckAt ? `hỏi lại ${formatDate(worry.nextCheckAt)}` : "tự cập nhật khi muốn") : STATUS_LABEL[worry.status];
  const checkLine = open
    ? worry.nextCheckAt
      ? `${name} sẽ hỏi thăm lại ngày ${formatDate(worry.nextCheckAt)} nhé.`
      : `${name} thôi hỏi chuyện này rồi. Bạn tự cập nhật khi muốn nhé.`
    : worry.status === "stale"
      ? "Lâu rồi chưa cập nhật. Muốn thì bạn cập nhật lại nhé."
      : null;
  const done = () => {
    setMode("view");
    router.refresh();
  };

  return (
    <li className={cn("overflow-hidden", grouped ? "rounded-[1.15rem] bg-surface-2" : "rounded-[1.4rem] bg-surface", !grouped && !flat && "shadow-soft")}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2.5 py-2.5 text-left transition sm:gap-3",
          grouped ? "pl-3.5 pr-3 hover:bg-surface/40" : "px-3 hover:bg-surface-2/50 sm:px-3.5 sm:py-3",
        )}
      >
        {!grouped && (
          <span
            aria-hidden
            className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-xl sm:size-11", TOPIC_TONE[worry.topic] ?? "bg-surface-2")}
          >
            {worry.emoji}
          </span>
        )}
        <span className="min-w-0 flex-1">
          {grouped ? (
            <span className={cn("block truncate font-bold", worry.note && "italic")}>
              {worry.note ? `“${worry.note}”` : `Kể ${formatDate(worry.createdAt)}`}
            </span>
          ) : (
            <span className="block truncate font-bold">
              {worry.label}
              {worry.note && <span className="font-normal italic text-muted"> · “{worry.note}”</span>}
            </span>
          )}
          <span className="block truncate text-[13px] text-muted">
            {grouped && !worry.note ? when : `kể ${formatDate(worry.createdAt)} · ${when}`}
          </span>
        </span>
        {/* mây lúc kể → mây bây giờ */}
        <span
          className="flex shrink-0 items-center gap-0.5 text-muted"
          aria-label={`Lúc kể: ${LEVEL_LABELS[worry.levelStart - 1]}. Bây giờ: ${LEVEL_LABELS[worry.levelNow - 1]}.`}
        >
          <WeatherCloud level={worry.levelStart} className="size-7 sm:size-8" />
          {worry.checks.length > 0 && (
            <>
              <span aria-hidden className="text-xs">
                →
              </span>
              <WeatherCloud level={worry.levelNow} className="size-7 sm:size-8" />
            </>
          )}
        </span>
        <Chevron open={expanded} white={grouped} />
      </button>

      {expanded && (
        <div id={panelId} className={cn("space-y-2.5 pb-4 pt-1 text-sm", grouped ? "px-3.5" : "px-3 sm:px-4")}>
          {/* đường đi của đám mây: lúc kể → từng lần hỏi lại */}
          <ol aria-label="Mức lo theo thời gian" className="flex flex-wrap items-start gap-x-2 gap-y-3 rounded-[1.15rem] bg-sky px-2.5 py-3">
            <li className="flex min-w-16 flex-col items-center">
              <CloudStep level={worry.levelStart} caption={`kể ${formatDate(worry.createdAt)}`} />
            </li>
            {worry.checks.map((c, i) => (
              <Fragment key={c.at}>
                <li aria-hidden className="pt-3 font-bold text-sky-ink">
                  →
                </li>
                <li className="flex min-w-16 flex-col items-center">
                  <CloudStep level={c.level} caption={i === worry.checks.length - 1 ? `mới nhất ${formatDate(c.at)}` : formatDate(c.at)} />
                  {c.tried && (
                    <span className="mt-0.5 rounded-full bg-surface px-2 text-center text-[10.5px] font-semibold text-sky-ink">{TRIED_LABEL[c.tried]}</span>
                  )}
                </li>
              </Fragment>
            ))}
          </ol>

          {checkLine && (
            <p className="flex items-center gap-2 text-muted">
              {open && (
                <span aria-hidden className="shrink-0">
                  <MascotArt size={26} />
                </span>
              )}
              <span>{checkLine}</span>
            </p>
          )}

          {/* khó khăn đã xác nhận: trợ lý dựa vào câu này để gợi ý; mọi lần sửa đều còn lại */}
          {worry.difficulty && mode !== "difficulty" && (
            <div className={cn("rounded-2xl px-3.5 py-2.5", inner)}>
              <p>
                <span className="font-semibold">Khó khăn bạn đã xác nhận:</span> {worry.difficulty}
              </p>
              {worry.revisions.length > 1 && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-[13px] text-muted">Cách hiểu đã đổi {worry.revisions.length - 1} lần</summary>
                  <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-[13px]">
                    {worry.revisions.map((r) => (
                      <li key={r.at} className={cn(r.action === "rejected" && "text-muted line-through")}>
                        {formatDate(r.at)} · {r.text}
                        <span className="sr-only">{r.action === "rejected" ? " (bạn nói chưa đúng)" : " (bạn xác nhận)"}</span>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </div>
          )}
          {/* mục 4.1: điều bạn nói sẽ chỉnh lần sau, ở lần hỏi lại gần nhất có ghi */}
          {nextTime && (
            <p className={cn("rounded-2xl px-3.5 py-2.5", inner)}>
              <span className="font-semibold">Lần sau bạn sẽ chỉnh:</span> “{nextTime}”
            </p>
          )}

          {mode === "difficulty" && (
            <DifficultyConfirm
              text={worry.difficulty ?? ""}
              worryId={worry.id}
              source="journey"
              ownWords
              askFirst
              onConfirmed={done}
              onSkip={() => setMode("view")}
            />
          )}

          {mode === "update" && (
            <div className={cn("rounded-3xl p-4", inner)}>
              <FollowupForm worry={worry} ask={loop.ask} lines={loop.lines} badges={loop.badgeInfo} hasSteps={loop.hasSteps} onFinished={done} />
            </div>
          )}

          {mode === "delete" && (
            <div className={cn("rounded-3xl p-4", inner)} role="alertdialog" aria-label="Xóa chuyện này?">
              <p className="font-semibold">Xóa chuyện này?</p>
              <p className="text-muted">Các lần hỏi lại của chuyện này cũng mất. Giọt nước và huy hiệu bạn đã có vẫn giữ nguyên.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending}
                  className={btn.danger}
                  onClick={() =>
                    start(async () => {
                      const res = await deleteWorry(worry.id);
                      if (!res.ok) setError(res.error);
                    })
                  }
                >
                  {pending ? "Đang xóa…" : "Xóa"}
                </button>
                <button type="button" onClick={() => setMode("view")} className={btn.secondary}>
                  Giữ lại
                </button>
              </div>
            </div>
          )}

          {mode === "view" && (
            <div className="flex flex-wrap gap-2">
              {canAnswer(worry.status) && (
                <button type="button" onClick={() => setMode("update")} className={cn(btn.primary, "px-5 py-2 text-sm")}>
                  Cập nhật
                </button>
              )}
              {canAnswer(worry.status) && (
                <button
                  type="button"
                  onClick={() => setMode("difficulty")}
                  className={cn("inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold transition hover:text-ink", inner)}
                >
                  {worry.difficulty ? "Sửa khó khăn" : "Ghi khó khăn"}
                </button>
              )}
              <button type="button" onClick={() => setMode("delete")} className={cn(btn.ghost, "min-h-11 px-3 text-sm font-bold")}>
                Xóa
              </button>
            </div>
          )}
          {error && (
            <p role="alert" className="text-danger">
              {error}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
