"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { restoreSettingVersion } from "@/app/actions/admin";
import { useUndo } from "@/components/staff/Undo";
import { btn } from "@/components/ui/styles";
import type { SettingKey } from "@/lib/settings";

/** "Dùng lại bản này" (có Hoàn tác). */
export function VersionButton({ settingKey, versionId }: { settingKey: SettingKey; versionId: number }) {
  const router = useRouter();
  const offerUndo = useUndo();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={btn.secondary}
      onClick={() =>
        start(async () => {
          const res = await restoreSettingVersion(settingKey, versionId);
          if (!res.ok) offerUndo(res.error);
          else {
            const undo = res.settingUndo;
            offerUndo(
              "Đã dùng lại bản này.",
              undo
                ? async () => {
                    const r = await restoreSettingVersion(undo.key, undo.versionId);
                    return r.ok ? { ok: true } : r;
                  }
                : undefined,
            );
          }
          router.refresh();
        })
      }
    >
      {pending ? "Đang đổi…" : "Dùng lại bản này"}
    </button>
  );
}
