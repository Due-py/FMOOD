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
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import { formatDate } from "@/lib/dates";
import type { JourneyLoop, JourneyWorry } from "@/lib/loop-content";
import { canAnswer, LEVEL_LABELS, TRIED_LABEL, type WorryStatus } from "@/lib/worries-shared";
import { Empty, Section } from "@/components/Section";

const STATUS_LABEL: Record<WorryStatus, string> = {
  open: "Đang theo dõi",
  better: "Đã nhẹ lòng",
  done: "Đã xong",
  stale: "Lâu không cập nhật",
};

/** số chuyện đang theo dõi hiện sẵn; còn lại sau nút "Xem thêm" */
const SHOW_FIRST = 5;

/** sắp chuyện đang theo dõi: chuyện sắp được hỏi lại trước, chuyện không còn lịch hỏi lại xuống cuối */
const byNextCheck = (a: JourneyWorry, b: JourneyWorry) => (a.nextCheckAt ?? "9999").localeCompare(b.nextCheckAt ?? "9999");

/**
 * Chuyện bận lòng: MỘT danh sách, mỗi chuyện MỘT DÒNG (chủ đề, ngày kể, lịch hỏi lại, mây lúc kể → mây bây giờ).
 * Bấm dòng mới mở chi tiết: chuỗi mây đầy đủ, khó khăn đã xác nhận, Cập nhật / Ghi khó khăn / Xóa. Chuyện sắp hỏi lại
 * lên đầu; hiện sẵn 5 chuyện, còn lại sau "Xem thêm". Chuyện đã qua gập lại sẵn. Cập nhật nhanh thì ở trang Hôm nay
 * (thẻ hỏi lại đến hạn). Việc nhỏ đã thử, huy hiệu, giọt nước nằm ở khối Ghi nhận (Recognition).
 */
export function WorrySection({ loop }: { loop: JourneyLoop }) {
  const [showAll, setShowAll] = useState(false);
  const following = loop.worries.filter((w) => w.status === "open").sort(byNextCheck);
  const past = loop.worries.filter((w) => w.status !== "open");
  const shown = showAll ? following : following.slice(0, SHOW_FIRST);
  const hidden = following.length - shown.length;

  return (
    <Section id="chuyen-ban-long" title="Chuyện bận lòng" note={following.length ? `${following.length} chuyện đang theo dõi` : undefined}>
      {following.length ? (
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
          <ul className="divide-y divide-line">
            {shown.map((w) => (
              <WorryRow key={w.id} worry={w} loop={loop} />
            ))}
          </ul>
          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="flex min-h-11 w-full items-center justify-center border-t border-line text-sm font-semibold text-brand-strong hover:bg-surface-2"
            >
              Xem thêm {hidden} chuyện
            </button>
          )}
        </div>
      ) : (
        <Empty>
          Chưa có chuyện nào đang theo dõi.{" "}
          <Link href="/checkin" className="font-semibold text-brand-strong underline underline-offset-4">
            Check-in
          </Link>{" "}
          khi bạn muốn kể nhé.
        </Empty>
      )}

      {past.length > 0 && (
        <details className="group overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2 font-semibold [&::-webkit-details-marker]:hidden">
            <span className="flex-1">Đã qua ({past.length})</span>
            <span aria-hidden className="text-muted transition group-open:rotate-180">
              ▾
            </span>
          </summary>
          <ul className="divide-y divide-line border-t border-line">
            {past.map((w) => (
              <WorryRow key={w.id} worry={w} loop={loop} />
            ))}
          </ul>
        </details>
      )}
    </Section>
  );
}

/** Một chuyện bận lòng: một dòng gọn; bấm để mở chuỗi mây, chi tiết và các nút. */
function WorryRow({ worry, loop }: { worry: JourneyWorry; loop: JourneyLoop }) {
  const { name } = useAssistant();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<"view" | "update" | "delete" | "difficulty">("view");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const open = worry.status === "open";
  const nextTime = worry.checks.findLast((c) => c.nextTime)?.nextTime ?? null;
  const panelId = `chuyen-${worry.id}`;

  // dòng phụ ngắn: ngày kể · lịch hỏi lại (hoặc trạng thái với chuyện đã qua)
  const when = open ? (worry.nextCheckAt ? `hỏi lại ${formatDate(worry.nextCheckAt)}` : "tự cập nhật khi muốn") : STATUS_LABEL[worry.status];
  const checkLine = open
    ? worry.nextCheckAt
      ? `${name} sẽ hỏi thăm lại ngày ${formatDate(worry.nextCheckAt)}.`
      : `${name} thôi hỏi chuyện này rồi. Bạn tự cập nhật khi muốn nhé.`
    : worry.status === "stale"
      ? "Lâu rồi chưa cập nhật. Muốn thì bạn cập nhật lại nhé."
      : null;
  const done = () => {
    setMode("view");
    router.refresh();
  };

  return (
    <li>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2"
      >
        <span
          aria-hidden
          className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-lg", TOPIC_TONE[worry.topic] ?? "bg-surface-2")}
        >
          {worry.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">
            {worry.label}
            {worry.note && <span className="font-normal italic text-muted"> · “{worry.note}”</span>}
          </span>
          <span className="block truncate text-sm text-muted">
            kể {formatDate(worry.createdAt)} · {when}
          </span>
        </span>
        {/* mây lúc kể → mây bây giờ */}
        <span
          className="flex shrink-0 items-center gap-0.5 text-muted"
          aria-label={`Lúc kể: ${LEVEL_LABELS[worry.levelStart - 1]}. Bây giờ: ${LEVEL_LABELS[worry.levelNow - 1]}.`}
        >
          <WeatherCloud level={worry.levelStart} className="size-8" />
          {worry.checks.length > 0 && (
            <>
              <span aria-hidden className="text-xs">
                →
              </span>
              <WeatherCloud level={worry.levelNow} className="size-8" />
            </>
          )}
        </span>
        <span aria-hidden className={cn("shrink-0 text-muted transition", expanded && "rotate-180")}>
          ▾
        </span>
      </button>

      {expanded && (
        <div id={panelId} className="space-y-3 bg-surface-2/50 px-4 pb-4 pt-1 text-sm">
          {/* đường đi của đám mây: lúc kể → từng lần hỏi lại */}
          <ol aria-label="Mức lo theo thời gian" className="flex flex-wrap items-center gap-x-2 gap-y-3">
            <li>
              <CloudStep level={worry.levelStart} caption={`kể ${formatDate(worry.createdAt)}`} />
            </li>
            {worry.checks.map((c, i) => (
              <Fragment key={c.at}>
                <li aria-hidden className="text-muted">
                  →
                </li>
                <li>
                  <CloudStep level={c.level} caption={i === worry.checks.length - 1 ? `mới nhất ${formatDate(c.at)}` : formatDate(c.at)} />
                  {c.tried && <span className="block text-center text-[11px] text-muted">{TRIED_LABEL[c.tried]}</span>}
                </li>
              </Fragment>
            ))}
          </ol>

          {checkLine && <p className="text-muted">{checkLine}</p>}

          {/* khó khăn đã xác nhận: trợ lý dựa vào câu này để gợi ý; mọi lần sửa đều còn lại */}
          {worry.difficulty && mode !== "difficulty" && (
            <div className="rounded-2xl bg-surface px-4 py-3">
              <p>
                <span className="font-semibold">Khó khăn bạn đã xác nhận:</span> {worry.difficulty}
              </p>
              {worry.revisions.length > 1 && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-muted">Cách hiểu đã đổi {worry.revisions.length - 1} lần</summary>
                  <ol className="mt-1 space-y-0.5">
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
            <p className="rounded-2xl bg-surface px-4 py-2.5">
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
            <div className="rounded-3xl bg-surface p-4">
              <FollowupForm worry={worry} ask={loop.ask} lines={loop.lines} badges={loop.badgeInfo} hasSteps={loop.hasSteps} onFinished={done} />
            </div>
          )}

          {mode === "delete" && (
            <div className="rounded-3xl bg-surface p-4" role="alertdialog" aria-label="Xóa chuyện này?">
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
                <button type="button" onClick={() => setMode("update")} className={cn(btn.secondary, "px-4 py-2 text-sm")}>
                  Cập nhật
                </button>
              )}
              {canAnswer(worry.status) && (
                <button type="button" onClick={() => setMode("difficulty")} className={cn(btn.ghost, "px-3 py-2 text-sm")}>
                  {worry.difficulty ? "Sửa khó khăn" : "Ghi khó khăn"}
                </button>
              )}
              <button type="button" onClick={() => setMode("delete")} className={cn(btn.ghost, "px-3 py-2 text-sm")}>
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
