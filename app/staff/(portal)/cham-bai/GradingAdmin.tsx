"use client";

import { useState } from "react";
import { lockGrading, openGrading, setRater } from "@/app/actions/bai-do";
import { Section, StatusText, useAction } from "@/components/admin/AdminUI";
import { btn, input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

type Props = {
  raters: { slot: 1 | 2; user_id: string; nickname: string }[];
  candidates: { id: string; nickname: string; role: string }[];
  opened: boolean;
  locked: boolean;
  lockedBy: string | null;
  responses: number;
  coded: number;
  sample: number;
  progress: { slot: 1 | 2; done: number; total: number }[];
  referred: number;
};

const ROLE: Record<string, string> = { teacher: "giáo viên", counselor: "tư vấn viên" };

/** Phần admin của trang Chấm bài: giao người chấm, mở chấm, khóa điểm. Chỉ có số đếm. */
export function GradingAdmin(p: Props) {
  const { pending, status, run } = useAction();
  const unassigned = p.raters.length < 2;

  return (
    <>
      <Section
        title="Người chấm"
        description="Hai thầy cô ngoài nhóm (giáo viên hoặc tư vấn viên). Người chấm 1 chấm mọi bài; người chấm 2 chấm lại 30 bài chọn ngẫu nhiên. Thành viên nhóm và admin không chấm."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {([1, 2] as const).map((slot) => (
            <RaterPicker
              key={slot}
              slot={slot}
              current={p.raters.find((r) => r.slot === slot)?.user_id ?? ""}
              candidates={p.candidates}
              disabled={pending || p.locked}
              onSave={(userId) => run(() => setRater(slot, userId || null), userId ? `Đã giao người chấm ${slot}.` : `Đã bỏ người chấm ${slot}.`)}
            />
          ))}
        </div>
      </Section>

      <Section
        title="Mở chấm"
        description="Mỗi bài nhận một mã ngẫu nhiên (B001, B002…), thứ tự đã xáo. Mở sau buổi đo lần 2 và buổi làm bù. Có bài làm bù sau khi mở thì bấm lại để thêm mã cho bài mới."
      >
        <p className="text-sm">
          {p.responses} bài đã nộp · {p.coded} bài đã có mã · {p.sample} bài người chấm 2 chấm lại
        </p>
        {!p.locked && (
          <button
            type="button"
            disabled={pending || p.responses === 0 || (p.opened && p.coded >= p.responses)}
            className={cn(btn.primary, "mt-3")}
            onClick={() => {
              const msg = p.opened
                ? "Thêm mã cho các bài mới nộp (làm bù)?"
                : `Mở chấm ${p.responses} bài?${unassigned ? " Chưa giao đủ hai người chấm (giao sau cũng được)." : ""}`;
              if (confirm(msg)) run(() => openGrading(), "Đã tạo mã chấm.");
            }}
          >
            {p.opened ? "Thêm mã cho bài mới" : "Mở chấm"}
          </button>
        )}
      </Section>

      <Section title="Tiến độ và khóa điểm" description="Khóa khi cả hai người chấm đã xong. Sau khi khóa, người chấm không sửa được nữa và bảng ghép mã mở ra. Không mở khóa lại được.">
        <ul className="space-y-2 text-sm">
          {p.progress.map((g) => (
            <li key={g.slot}>
              <div className="flex justify-between">
                <span>Người chấm {g.slot}</span>
                <span className="font-semibold tabular-nums">
                  {g.done}/{g.total} bài đủ 12 ô
                </span>
              </div>
              <div className="mt-1 h-3 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-brand" style={{ width: `${g.total ? (g.done / g.total) * 100 : 0}%` }} />
              </div>
            </li>
          ))}
        </ul>
        {p.referred > 0 && (
          <p className="mt-3 rounded-2xl bg-peach px-4 py-2.5 text-sm">
            Người chấm đã đánh dấu {p.referred} bài cần tư vấn viên xem. Cảnh báo đã gửi tới trang Cảnh báo.
          </p>
        )}
        {p.locked ? (
          <p className="mt-3 rounded-2xl bg-butter px-4 py-2.5 text-sm">🔒 Đã khóa điểm{p.lockedBy ? ` (${p.lockedBy})` : ""}.</p>
        ) : (
          <button
            type="button"
            disabled={pending || !p.opened}
            className={cn(btn.danger, "mt-3")}
            onClick={() => {
              const notDone = p.progress.some((g) => g.done < g.total);
              const msg = `${notDone ? "Còn bài chưa chấm đủ 12 ô. " : ""}Khóa điểm? Người chấm sẽ không sửa được nữa, bảng ghép mã với tài khoản sẽ mở. Không mở khóa lại được.`;
              if (confirm(msg)) run(() => lockGrading(), "Đã khóa điểm.");
            }}
          >
            Khóa điểm
          </button>
        )}
        <div className="mt-2">
          <StatusText status={status} />
        </div>
      </Section>
    </>
  );
}

function RaterPicker({
  slot,
  current,
  candidates,
  disabled,
  onSave,
}: {
  slot: 1 | 2;
  current: string;
  candidates: Props["candidates"];
  disabled: boolean;
  onSave: (userId: string) => void;
}) {
  const [value, setValue] = useState(current);
  return (
    <div>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Người chấm {slot}</span>
        <select value={value} onChange={(e) => setValue(e.target.value)} disabled={disabled} className={input}>
          <option value="">(chưa giao)</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nickname} · {ROLE[c.role] ?? c.role}
            </option>
          ))}
        </select>
      </label>
      <button type="button" disabled={disabled || value === current} className={cn(btn.secondary, "mt-2")} onClick={() => onSave(value)}>
        Lưu
      </button>
    </div>
  );
}
