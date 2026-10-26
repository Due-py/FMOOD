"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createDemo, recreateDemo, removeDemo } from "@/app/actions/demo";
import { btn } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";

type Action = "create" | "recreate" | "remove";

const LABEL: Record<Action, { idle: string; busy: string; confirm?: string }> = {
  create: { idle: "Tạo dữ liệu mẫu", busy: "Đang tạo 3 lớp mẫu… (khoảng 20 giây)" },
  recreate: { idle: "Tạo lại từ đầu", busy: "Đang xóa và tạo lại… (khoảng 30 giây)", confirm: "Bấm lần nữa để tạo lại (mọi thay đổi trên dữ liệu mẫu sẽ mất)" },
  remove: { idle: "Xóa dữ liệu mẫu", busy: "Đang xóa…", confirm: "Bấm lần nữa để xóa hết dữ liệu mẫu" },
};

/** Nút tạo / tạo lại / xóa dữ liệu mẫu. Xóa và tạo lại phải bấm hai lần. */
export function DemoDataPanel({ hasData }: { hasData: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [running, setRunning] = useState<Action | null>(null);
  const [armed, setArmed] = useState<Action | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  function run(action: Action) {
    if (LABEL[action].confirm && armed !== action) {
      setArmed(action);
      return;
    }
    setArmed(null);
    setStatus(null);
    setRunning(action);
    start(async () => {
      const res = action === "create" ? await createDemo() : action === "recreate" ? await recreateDemo() : await removeDemo();
      setRunning(null);
      if (!res.ok) setStatus({ ok: false, text: res.error });
      else if ("summary" in res) setStatus({ ok: true, text: `Xong: ${res.summary.classes} lớp, ${res.summary.students} bạn, ${res.summary.checkins} lần check-in, ${res.summary.worries} chuyện bận lòng.` });
      else setStatus({ ok: true, text: `Đã xóa ${res.classes} lớp mẫu và ${res.users} tài khoản mẫu.` });
      router.refresh();
    });
  }

  const actions: Action[] = hasData ? ["recreate", "remove"] : ["create"];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a}
            type="button"
            disabled={pending}
            onClick={() => run(a)}
            className={cn(a === "create" ? btn.primary : a === "remove" && armed === a ? btn.danger : btn.secondary)}
          >
            {running === a ? LABEL[a].busy : armed === a ? LABEL[a].confirm : LABEL[a].idle}
          </button>
        ))}
      </div>
      {status && (
        <p role="status" className={cn("rounded-2xl px-4 py-3 text-sm", status.ok ? "bg-mint" : "bg-danger-soft text-danger")}>
          {status.text}
        </p>
      )}
    </div>
  );
}
