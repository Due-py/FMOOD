"use client";

import { useState } from "react";
import Markdown from "react-markdown";
import { saveSettingAction } from "@/app/actions/admin";
import { Field, SaveBar, Section, textarea, useAction } from "@/components/admin/AdminUI";
import { CharacterAvatar } from "@/components/mascot/CharacterAvatar";
import { input } from "@/components/ui/styles";
import type { Contact } from "@/lib/settings";

type Crisis = { message: string; school: Contact; hotlines: Contact[] };

export function EmergencyForm({ initial }: { initial: Crisis }) {
  const [message, setMessage] = useState(initial.message);
  const [school, setSchool] = useState<Contact>(initial.school);
  const [hotlines, setHotlines] = useState<Contact[]>(initial.hotlines);
  const { pending, status, run } = useAction();

  const updateHotline = (i: number, patch: Partial<Contact>) =>
    setHotlines(hotlines.map((h, j) => (j === i ? { ...h, ...patch } : h)));

  return (
    <form action={() => run(() => saveSettingAction("safety.crisis", { message, school, hotlines }))} className="space-y-6">
      <Section title="Câu trả lời soạn sẵn" description="Viết bằng Markdown: **chữ đậm**, gạch đầu dòng bằng dấu -.">
        <div className="grid gap-4 lg:grid-cols-2">
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={14} className={textarea} aria-label="Câu trả lời soạn sẵn" />
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Học sinh sẽ thấy</p>
            <div className="flex items-end gap-2">
              <CharacterAvatar size={30} float={false} mood="worried" />
              <div className="rounded-3xl rounded-bl-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm leading-relaxed [&_li]:ml-4 [&_li]:list-disc [&_p+p]:mt-2 [&_ul+p]:mt-2 [&_ul]:mt-2">
                <Markdown>{message}</Markdown>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Phòng tham vấn của trường" description="Hiện đầu tiên trên thẻ hỗ trợ.">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Tên">
            <input value={school.name} onChange={(e) => setSchool({ ...school, name: e.target.value })} className={input} />
          </Field>
          <Field label="Địa điểm, giờ làm việc">
            <input value={school.detail} onChange={(e) => setSchool({ ...school, detail: e.target.value })} className={input} />
          </Field>
          <Field label="Số điện thoại (nếu có)">
            <input value={school.phone ?? ""} onChange={(e) => setSchool({ ...school, phone: e.target.value })} inputMode="tel" className={input} />
          </Field>
        </div>
      </Section>

      <Section title="Đường dây nóng" description="Tối đa 6 số. Học sinh bấm vào số để gọi luôn trên điện thoại.">
        <ul className="space-y-3">
          {hotlines.map((h, i) => (
            <li key={i} className="grid gap-2 rounded-2xl bg-surface-2 p-3 sm:grid-cols-[1fr_1.3fr_8rem_auto]">
              <input value={h.name} onChange={(e) => updateHotline(i, { name: e.target.value })} placeholder="Tên" aria-label="Tên" className={input} />
              <input value={h.detail} onChange={(e) => updateHotline(i, { detail: e.target.value })} placeholder="Mô tả" aria-label="Mô tả" className={input} />
              <input value={h.phone ?? ""} onChange={(e) => updateHotline(i, { phone: e.target.value })} placeholder="Số" aria-label="Số điện thoại" inputMode="tel" className={input} />
              <button
                type="button"
                onClick={() => setHotlines(hotlines.filter((_, j) => j !== i))}
                className="rounded-full px-3 text-sm font-semibold text-danger hover:bg-danger-soft"
              >
                Xóa
              </button>
            </li>
          ))}
        </ul>
        {hotlines.length < 6 && (
          <button
            type="button"
            onClick={() => setHotlines([...hotlines, { name: "", detail: "", phone: "" }])}
            className="mt-3 text-sm font-semibold text-brand-strong hover:underline dark:text-brand"
          >
            + Thêm số
          </button>
        )}
      </Section>

      <SaveBar pending={pending} status={status} settingKey="safety.crisis" />
    </form>
  );
}
