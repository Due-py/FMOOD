import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { listChallenges } from "@/lib/challenges";
import { addDays, dayKey } from "@/lib/dates";
import { listClasses } from "@/lib/staff";
import { MIN_GROUP } from "@/lib/staff-privacy";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/components/ui/cn";
import { NotReady } from "../NotReady";
import { ChallengeForm, ChallengeToggle } from "./ChallengeForms";
import { classLabel } from "@/lib/class-tools";

export const metadata: Metadata = { title: "Thử thách" };

function daysLeft(endsOn: string) {
  const today = dayKey();
  let n = 0;
  while (addDays(today, n) < endsOn && n < 30) n++;
  return n + 1;
}

export default async function ChallengesPage() {
  const profile = await requireStaff(["teacher", "admin"]);
  const [{ ready, items }, classes] = await Promise.all([listChallenges(profile), listClasses(profile)]);
  const running = items.filter((c) => c.open);
  const ended = items.filter((c) => !c.open);
  const today = dayKey();

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Lớp học" title="Thử thách">
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Gợi ý một việc nhỏ cả lớp cùng làm trong 1 hoặc 2 tuần. Học sinh tự bấm “Tham gia” và đánh dấu ở mục Thói quen. Không có
          bảng xếp hạng, không hiện tên; thầy cô chỉ thấy số bạn tham gia khi có từ {MIN_GROUP} bạn trở lên.
        </p>
      </PageHeader>

      {!ready ? (
        <NotReady />
      ) : classes.length === 0 ? (
        <p className="rounded-3xl bg-surface-2 p-6 text-center text-muted">Thầy cô chưa được gán lớp chủ nhiệm nào.</p>
      ) : (
        <>
          <ChallengeForm classes={classes.map((c) => ({ id: c.id, name: c.name }))} />

          <section aria-labelledby="running">
            <h2 id="running" className="mb-3 font-display text-2xl font-bold tracking-tight">
              Đang diễn ra
            </h2>
            {running.length === 0 ? (
              <p className="rounded-3xl bg-surface-2 p-6 text-center text-muted">Chưa có thử thách nào đang diễn ra.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {running.map((c) => (
                  <li key={c.id} className="rounded-[var(--radius-card)] bg-mint p-5">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl" aria-hidden>
                        {c.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-lg font-bold leading-tight tracking-tight">{c.title}</h3>
                        <p className="text-sm text-muted">
                          {classLabel(c.class_name ?? "")} · còn {daysLeft(c.ends_on)} ngày
                        </p>
                      </div>
                    </div>
                    {c.description && <p className="mt-3 text-sm">{c.description}</p>}
                    <Stats joined={c.joined} doneTimes={c.doneTimes} />
                    <ChallengeToggle id={c.id} title={c.title} open />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {ended.length > 0 && (
            <section aria-labelledby="ended">
              <h2 id="ended" className="mb-3 font-display text-2xl font-bold tracking-tight">
                Đã kết thúc
              </h2>
              <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
                {ended.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                    <span className="text-2xl" aria-hidden>
                      {c.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{c.title}</p>
                      <p className="text-sm text-muted">
                        {classLabel(c.class_name ?? "")} ·{" "}
                        {c.joined === null ? `dưới ${MIN_GROUP} bạn tham gia` : `${c.joined} bạn tham gia, ${c.doneTimes} lượt làm`}
                      </p>
                    </div>
                    {c.ends_on >= today && <ChallengeToggle id={c.id} title={c.title} open={false} />}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Stats({ joined, doneTimes }: { joined: number | null; doneTimes: number | null }) {
  return (
    <p className={cn("mt-3 rounded-2xl bg-surface/70 px-4 py-3 text-sm")}>
      {joined === null ? (
        <>Chưa đủ {MIN_GROUP} bạn tham gia nên chưa hiện số, để không ai bị nhận ra.</>
      ) : (
        <>
          <strong className="font-display text-xl">{joined}</strong> bạn tham gia · <strong className="font-display text-xl">{doneTimes}</strong> lượt
          làm
        </>
      )}
    </p>
  );
}
