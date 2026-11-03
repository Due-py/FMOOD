"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";

// "Chọn một thế giới kỹ năng" (mẫu giao diện vui, Duy duyệt 02/11; 03/11 chỉ còn tên An Hòa, bỏ tên thân thiện và sao): 5 ô năng lực nhiều màu, bấm ô nào thì các bài luyện
// của nhóm đó hiện bên dưới thành thẻ màu lớn, cuối khung là "Góc đọc thêm" (bài đọc theo chủ đề, gấp sẵn).
// Dữ liệu dựng sẵn ở trang (máy chủ); ở đây chỉ giữ nhóm đang chọn, góc đọc mở hay gấp, chủ đề đang xem.

export type WorldSkill = { id: string; name: string; emoji: string; objective: string; count: number; href: string };
export type WorldReading = { id: string; slug: string; title: string; emoji: string; grade: number | null; skillName: string | null };
export type World = {
  key: string;
  name: string;
  emoji: string;
  tone: number;
  skills: WorldSkill[];
  topics: { topic: string; emoji: string; readings: WorldReading[] }[];
};

const FIRST = 4;

function Shelf({ world }: { world: World }) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState(0);
  const [all, setAll] = useState(false);
  const total = world.topics.reduce((n, t) => n + t.readings.length, 0);
  const current = world.topics[topic] ?? world.topics[0];
  const list = all ? current.readings : current.readings.slice(0, FIRST);
  return (
    <div className="mt-4 rounded-[1.375rem] bg-sky px-4 py-3 text-sky-ink">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-11 w-full items-center gap-3 text-left">
        <span aria-hidden className="text-2xl">
          📚
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg font-bold leading-tight">Góc đọc thêm</span>
          <span className="block text-xs">{total} bài đọc ngắn để hiểu sâu hơn</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-sm font-bold">
          {open ? "Gấp lại" : "Mở ra"}
          <ChevronDownIcon size={16} className={cn("transition", open && "rotate-180")} />
        </span>
      </button>
      {open && (
        <div className="pb-1 pt-2">
          {world.topics.length > 1 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Chủ đề bài đọc">
              {world.topics.map((t, i) => (
                <button
                  key={t.topic}
                  type="button"
                  aria-pressed={i === topic}
                  onClick={() => {
                    setTopic(i);
                    setAll(false);
                  }}
                  className={cn(
                    "min-h-11 rounded-full px-3.5 text-sm font-semibold transition",
                    i === topic ? "bg-sky-ink text-sky" : "bg-surface text-sky-ink hover:brightness-95",
                  )}
                >
                  <span aria-hidden>{t.emoji}</span> {t.topic} · {t.readings.length}
                </button>
              ))}
            </div>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {list.map((l) => (
              <Link key={l.id} href={`/library/${l.slug}`} className="flex min-h-12 items-center gap-2.5 rounded-2xl bg-surface px-3 py-2 text-sm font-semibold transition hover:-translate-y-0.5">
                <span aria-hidden className="text-xl">
                  {l.emoji}
                </span>
                <span className="min-w-0 flex-1 leading-snug">{l.title}</span>
                {l.grade && (
                  <span className="shrink-0 rounded-lg bg-sky px-1.5 py-0.5 text-[11px] font-extrabold" title={`Lớp ${l.grade}`}>
                    C{l.grade}
                  </span>
                )}
                {l.skillName && <span className="sr-only">, có bài luyện {l.skillName}</span>}
              </Link>
            ))}
          </div>
          {!all && current.readings.length > FIRST && (
            <button type="button" onClick={() => setAll(true)} className="mt-2 min-h-11 px-1 text-sm font-bold underline-offset-4 hover:underline">
              Xem thêm {current.readings.length - FIRST} bài
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function SkillWorlds({ worlds, initial }: { worlds: World[]; initial: number }) {
  const [cur, setCur] = useState(initial);
  const w = worlds[cur];
  return (
    <section aria-labelledby="the-gioi">
      <h2 id="the-gioi" className="font-display text-2xl font-extrabold tracking-tight">
        Chọn một thế giới kỹ năng
      </h2>
      <p className="mt-0.5 text-sm text-muted">5 nhóm năng lực, mỗi nhóm vài bài luyện ngắn.</p>

      <div className="-mx-4 mt-3 flex snap-x gap-2.5 overflow-x-auto px-4 pb-2 pt-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0">
        {worlds.map((g, i) => (
          <button
            key={g.key}
            type="button"
            aria-pressed={i === cur}
            onClick={() => setCur(i)}
            className={cn(
              `tone-${g.tone}`,
              "w-32 shrink-0 snap-start rounded-[1.5rem] bg-tint px-2 pb-3 pt-3.5 text-center transition duration-200 hover:-translate-y-1 sm:w-auto",
              i === cur && "-translate-y-1 shadow-soft ring-[3px] ring-tmid",
            )}
          >
            <span aria-hidden className="mx-auto grid size-14 place-items-center rounded-full bg-surface text-3xl">
              {g.emoji}
            </span>
            <span className="mt-2 block font-display text-[15px] font-bold leading-tight text-tink">{g.name}</span>
          </button>
        ))}
      </div>

      <div className={cn(`tone-${w.tone}`, "mt-4 rounded-[1.75rem] bg-surface p-4 shadow-soft sm:p-5")}>
        <div className="flex items-center gap-3">
          <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-2xl bg-tint text-2xl">
            {w.emoji}
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-2xl font-bold leading-tight text-tink">{w.name}</h3>
            {w.skills.length > 0 && (
              <p className="text-sm text-muted">
                Bạn đã thử {w.skills.filter((s) => s.count > 0).length}/{w.skills.length} bài
              </p>
            )}
          </div>
        </div>

        {w.skills.length === 0 && w.topics.length === 0 && <p className="mt-4 rounded-2xl bg-tint px-4 py-3 text-sm">Nội dung đang được bổ sung.</p>}

        {w.skills.length > 0 && (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {w.skills.map((s) => (
              <li key={s.id}>
                <Link href={s.href} className="flex h-full min-h-40 flex-col gap-1.5 rounded-[1.375rem] bg-tint p-4 transition duration-200 hover:-translate-y-1 hover:-rotate-[0.6deg]">
                  <span aria-hidden className="grid size-12 place-items-center rounded-2xl bg-surface text-2xl">
                    {s.emoji}
                  </span>
                  <span className="font-display text-[17px] font-bold leading-snug">{s.name}</span>
                  <span className="line-clamp-3 text-sm leading-snug text-muted">{s.objective}</span>
                  <span className="mt-auto flex items-center justify-between pt-1">
                    <span className={cn("rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold text-tink", s.count === 0 && "-rotate-3")}>
                      {s.count > 0 ? `⭐ Đã luyện ${s.count} lần` : "✨ Mới"}
                    </span>
                    <span aria-hidden className="grid size-8 place-items-center rounded-full bg-surface font-bold text-tink">
                      →
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {w.topics.length > 0 && <Shelf key={w.key} world={w} />}
      </div>
    </section>
  );
}
