import type { Metadata } from "next";
import { z } from "zod";
import { requirePage } from "@/lib/permissions";
import { journeyData, type JourneyData } from "@/lib/demo/journey";
import { demoStudents } from "@/lib/demo/people";
import { demoOn, demoRegistry } from "@/lib/demo/server";
import { weekdayLabel } from "@/lib/dates";
import { LEVEL_LABELS } from "@/lib/worries-shared";
import { WeatherCloud } from "@/components/LevelPicker";
import { cn } from "@/components/ui/cn";
import { DemoStepFooter, DemoStepHeader } from "../DemoChrome";
import { FastForward, PhonePreview, StudentPicker } from "./JourneyControls";

export const metadata: Metadata = { title: "Trình diễn: hành trình của một bạn" };

const STATUS: Record<string, string> = { open: "Đang theo dõi", better: "Đã đỡ", done: "Đã xong", stale: "Lâu không cập nhật" };
const TONE = { mint: "bg-mint", sky: "bg-sky", peach: "bg-peach", lilac: "bg-lilac", butter: "bg-butter" } as const;

const fmt = (iso: string) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "numeric", month: "numeric" }).format(new Date(iso));

export default async function JourneyPage({ searchParams }: { searchParams: Promise<{ ban?: string }> }) {
  await requirePage("/staff/trinh-dien");
  const [{ ban }, demo, registry, students] = await Promise.all([searchParams, demoOn(), demoRegistry(), demoStudents()]);
  const picked = ban && z.uuid().safeParse(ban).success ? ban : (registry?.showcase.journey ?? null);
  const data = picked ? await journeyData(picked) : null;

  return (
    <div className="space-y-8">
      <DemoStepHeader slug="hanh-trinh" demo={demo} hasData={Boolean(registry)} />
      {data && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StudentPicker students={students} current={data.student.id} />
            <p className="text-sm text-muted">
              {data.student.className} · check-in {data.checkinDays}/31 ngày · GVCN {data.teacherName ?? "chưa có"}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="min-w-0 space-y-6">
              <MoodCalendar data={data} />
              <Worries data={data} />
              <Timeline data={data} />
            </div>
            <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
              <div className="rounded-[var(--radius-card)] bg-butter p-4">
                <p className="font-display text-lg font-bold">Tua nhanh thời gian</p>
                <p className="mb-3 text-sm text-muted">Như thể {data.student.nickname} sống thêm 7 ngày. Chỉ làm được với bạn mẫu.</p>
                <FastForward studentId={data.student.id} nickname={data.student.nickname} />
              </div>
              <PhonePreview studentId={data.student.id} nickname={data.student.nickname} followup={data.followup} nextCheck={data.nextCheck} />
            </aside>
          </div>

          <WhoSees data={data} />
        </>
      )}
      <DemoStepFooter slug="hanh-trinh" />
    </div>
  );
}

function MoodCalendar({ data }: { data: JourneyData }) {
  return (
    <section aria-labelledby="cal-title" className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <h2 id="cal-title" className="font-display text-2xl font-bold tracking-tight">
        Một tháng của {data.student.nickname}
      </h2>
      <p className="text-sm text-muted">Mỗi ô là một ngày: cảm xúc bạn ấy chọn nhiều nhất. Ô trống là ngày không check-in.</p>
      <ol className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
        {data.calendar.map((d, i) => (
          <li key={d.day} className="flex flex-col items-center gap-0.5">
            <span
              title={d.label ?? "Không check-in"}
              className={cn("flex aspect-square w-full items-center justify-center rounded-2xl text-xl sm:text-2xl", !d.emoji && "border border-dashed border-line")}
              style={d.color ? { backgroundColor: `${d.color}38` } : undefined}
            >
              {d.emoji ?? ""}
            </span>
            <span className={cn("text-[10px] tabular-nums", i === data.calendar.length - 1 ? "font-bold text-ink" : "text-muted")}>
              {i === data.calendar.length - 1 ? "Nay" : `${weekdayLabel(d.day)} ${Number(d.day.slice(8))}`}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Worries({ data }: { data: JourneyData }) {
  if (!data.worries.length) return null;
  return (
    <section aria-labelledby="worry-title" className="space-y-3">
      <h2 id="worry-title" className="font-display text-2xl font-bold tracking-tight">
        Chuyện bận lòng và mức lo qua từng lần trợ lý hỏi lại
      </h2>
      <ul className="space-y-3">
        {data.worries.map((w) => (
          <li key={w.id} className="rounded-[var(--radius-card)] bg-surface-2 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-display text-lg font-bold">
                {w.emoji} {w.label}
              </p>
              <p className="text-sm text-muted">
                Kể ngày {fmt(w.createdAt)} · {STATUS[w.status] ?? w.status}
              </p>
            </div>
            {w.note && <p className="mt-1 text-sm italic text-muted">“{w.note}” (chỉ bạn ấy đọc được)</p>}
            <ol className="mt-3 flex flex-wrap items-end gap-1">
              <li>
                <Cloud level={w.levelStart} caption={`lúc kể ${fmt(w.createdAt)}`} />
              </li>
              {w.checks.map((c) => (
                <li key={c.at} className="flex items-end gap-1">
                  <span className="mb-6 text-muted" aria-hidden>
                    →
                  </span>
                  <Cloud level={c.level} caption={`hỏi lại ${fmt(c.at)}`} />
                </li>
              ))}
              {w.status === "open" && w.nextCheckAt && (
                <li className="mb-6 ml-2 rounded-full border-2 border-dashed border-ink/20 px-3 py-1 text-xs font-semibold">
                  Trợ lý hỏi lại ngày {fmt(w.nextCheckAt)}
                </li>
              )}
            </ol>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Cloud({ level, caption }: { level: number; caption: string }) {
  return (
    <span className="flex w-20 flex-col items-center text-center">
      <WeatherCloud level={level} />
      <span className="text-[11px] font-semibold leading-tight">{LEVEL_LABELS[level - 1]}</span>
      <span className="text-[10px] text-muted">{caption}</span>
    </span>
  );
}

function Timeline({ data }: { data: JourneyData }) {
  return (
    <section aria-labelledby="time-title" className="space-y-3">
      <h2 id="time-title" className="font-display text-2xl font-bold tracking-tight">
        Dòng thời gian
      </h2>
      <ol className="relative space-y-2 border-l-2 border-dashed border-line pl-5">
        {data.events.map((e, i) => (
          <li key={`${e.at}-${i}`} className="relative">
            <span className={cn("absolute -left-[33px] top-1.5 flex size-6 items-center justify-center rounded-full text-sm", TONE[e.tone])} aria-hidden>
              {e.emoji}
            </span>
            <p className="text-sm">
              <span className="mr-2 font-semibold tabular-nums text-muted">{fmt(e.at)}</span>
              <span className="font-semibold">{e.title}</span>
              {e.detail && <span className="text-muted"> · {e.detail}</span>}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function WhoSees({ data }: { data: JourneyData }) {
  const cols = [
    {
      title: `${data.student.nickname} thấy`,
      tone: "bg-mint",
      items: [
        `Toàn bộ chuyện của mình: ${data.checkinDays} ngày check-in, ${data.worries.length} chuyện bận lòng, ${data.privateCounts.messages} tin nhắn với trợ lý`,
        `${data.badges.length} huy hiệu${data.garden ? ` · cây ${data.garden.plant} đang ${data.garden.stage.toLowerCase()} ${data.garden.emoji}` : ""}`,
        "Có thể xóa chuyện của mình bất cứ lúc nào",
      ],
    },
    {
      title: `GVCN (${data.teacherName ?? "chưa có"}) thấy`,
      tone: "bg-sky",
      items: [
        "Cảm xúc CHUNG của cả lớp; ngày dưới 5 bạn check-in thì bị ẩn",
        data.teacherSees.length
          ? `${data.teacherSees.length} cảnh báo về bạn ấy, ${data.teacherSees.every((a) => a.hidden) ? "KHÔNG kèm nội dung" : "có nội dung"}`
          : "Không có cảnh báo nào về bạn ấy",
        `${data.helpToTeacher} lời nhờ gửi cho GVCN`,
      ],
    },
    {
      title: `Tư vấn viên (${data.counselorName ?? "mẫu"}) thấy`,
      tone: "bg-lilac",
      items: [
        data.counselorSees.length ? `${data.counselorSees.length} cảnh báo kèm đúng đoạn có vấn đề (để xử lý)` : "Không có cảnh báo nào về bạn ấy",
        `${data.helpToCounselor} lời nhờ gửi phòng tham vấn`,
        "Không đọc được các tin nhắn còn lại",
      ],
    },
    {
      title: "Không ai đọc được",
      tone: "bg-peach",
      items: [
        `${data.privateCounts.messages} tin nhắn trong ${data.privateCounts.conversations} cuộc trò chuyện với trợ lý`,
        `${data.privateCounts.reflections} câu trả lời suy ngẫm`,
        `${data.privateCounts.notes} dòng ghi chú trong chuyện bận lòng`,
      ],
    },
  ];
  return (
    <section aria-labelledby="who-title" className="space-y-3">
      <h2 id="who-title" className="font-display text-2xl font-bold tracking-tight">
        Ai thấy gì về {data.student.nickname}?
      </h2>
      <p className="text-sm text-muted">Số liệu ở cột GVCN và Tư vấn viên lấy bằng đúng hàm của trang GVCN / tư vấn viên, chạy với tài khoản mẫu của họ.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cols.map((c) => (
          <div key={c.title} className={cn("rounded-[var(--radius-card)] p-4", c.tone)}>
            <p className="font-display text-lg font-bold leading-tight">{c.title}</p>
            <ul className="mt-2 space-y-1.5 text-sm leading-snug">
              {c.items.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
