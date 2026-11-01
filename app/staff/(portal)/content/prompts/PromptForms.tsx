"use client";

import { useState } from "react";
import { saveSettingAction } from "@/app/actions/admin";
import { SaveBar, StringListEditor, useAction } from "@/components/admin/AdminUI";

export function StartersForm({ initial }: { initial: string[] }) {
  const [items, setItems] = useState(initial);
  const { pending, status, run } = useAction();
  return (
    <form action={() => run(() => saveSettingAction("chat.starters", { items }))} className="space-y-4">
      <StringListEditor values={items} onChange={setItems} max={8} placeholder="VD: Mình đang lo về kỳ thi" />
      <p className="text-xs text-muted">Tối đa 8 câu, mỗi câu tối đa 60 ký tự.</p>
      <SaveBar pending={pending} status={status} settingKey="chat.starters" />
    </form>
  );
}
