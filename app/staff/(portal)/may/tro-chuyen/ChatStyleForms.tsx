"use client";

import { useState, type ReactNode } from "react";
import { saveSettingAction } from "@/app/actions/admin";
import { Field, SaveBar, Section, useAction } from "@/components/admin/AdminUI";
import { MayPlayground } from "@/components/admin/MayPlayground";
import { input } from "@/components/ui/styles";
import { cn } from "@/components/ui/cn";
import {
  CHARACTER_KEYS,
  CHARACTERS,
  GUIDANCE_KEYS,
  GUIDANCE_LABEL,
  LENGTH_CAPS,
  LENGTH_KEYS,
  LENGTH_LABEL,
  MOTIVATION_KEYS,
  MOTIVATION_LABEL,
  type CharacterSettings,
  type OptionSettings,
  type StyleSettings,
} from "@/lib/ai/chat-style";
import type { SettingKey } from "@/lib/settings";

type Group = keyof StyleSettings;

/** Bốn ô lưu riêng (mỗi nhóm một cài đặt, có lịch sử và nút về mặc định), và sân thử chọn được tổ hợp. */
export function ChatStyleForms({ initial, histories }: { initial: StyleSettings; histories: Record<Group, ReactNode> }) {
  const [values, setValues] = useState<StyleSettings>(initial);
  // máy chủ trả giá trị mới (lưu, về mặc định, dùng lại bản trước): cập nhật đúng nhóm đó, giữ các nhóm đang sửa dở
  const [seen, setSeen] = useState(initial);
  const groups: Group[] = ["characters", "lengths", "guidance", "motivation"];
  const changed = groups.filter((g) => JSON.stringify(seen[g]) !== JSON.stringify(initial[g]));
  if (changed.length) {
    const next = { ...values };
    for (const g of changed) Object.assign(next, { [g]: initial[g] });
    setSeen(initial);
    setValues(next);
  }
  const set = <G extends Group>(g: G, v: StyleSettings[G]) => setValues((cur) => ({ ...cur, [g]: v }));

  return (
    <div className="space-y-6">
      <CharactersBox value={values.characters} onChange={(v) => set("characters", v)} history={histories.characters} />
      <OptionsBox
        settingKey="style.lengths"
        title="Độ dài câu trả lời"
        description="Câu hướng dẫn gửi cho trợ lý ở từng mức. Giới hạn số từ và số tin nhắn do máy chủ giữ cố định, không sửa ở đây."
        keys={LENGTH_KEYS}
        labels={LENGTH_LABEL}
        caps={(k) => `Tối đa ${LENGTH_CAPS[k].words} từ, ${LENGTH_CAPS[k].messages} tin nhắn`}
        value={values.lengths}
        onChange={(v) => set("lengths", v)}
        history={histories.lengths}
      />
      <OptionsBox
        settingKey="style.guidance"
        title="Cách dẫn dắt"
        description="Trợ lý dẫn dắt cuộc trò chuyện thế nào."
        keys={GUIDANCE_KEYS}
        labels={GUIDANCE_LABEL}
        value={values.guidance}
        onChange={(v) => set("guidance", v)}
        history={histories.guidance}
      />
      <OptionsBox
        settingKey="style.motivation"
        title="Động lực và mục tiêu"
        description="Khi nào và bằng cách nào trợ lý đề nghị mục tiêu (thẻ “Thêm vào thói quen”)."
        keys={MOTIVATION_KEYS}
        labels={MOTIVATION_LABEL}
        value={values.motivation}
        onChange={(v) => set("motivation", v)}
        history={histories.motivation}
      />
      <MayPlayground styles={values} />
    </div>
  );
}

function DefaultRadio({ name, checked, onChange }: { name: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="accent-[var(--brand)]" />
      Mặc định
    </label>
  );
}

function CharactersBox({ value, onChange, history }: { value: CharacterSettings; onChange: (v: CharacterSettings) => void; history: ReactNode }) {
  const { pending, status, run } = useAction();
  const setItem = (k: (typeof CHARACTER_KEYS)[number], field: "tone" | "intro", text: string) =>
    onChange({ ...value, items: { ...value.items, [k]: { ...value.items[k], [field]: text } } });
  return (
    <div className="space-y-3">
      <form action={() => run(() => saveSettingAction("style.characters", value))}>
        <Section
          title="Nhân vật"
          description="Tên và emoji cố định. Giọng điệu là câu gửi cho trợ lý; câu giới thiệu hiện ở màn hình trò chuyện trống (luôn kèm câu nói rõ đây là AI). Đổi nhân vật mặc định thì học sinh chưa tự chọn thấy nhân vật mới."
        >
          <div className="grid gap-4 lg:grid-cols-3">
            {CHARACTER_KEYS.map((k) => (
              <div key={k} className={cn("rounded-3xl p-4", CHARACTERS[k].tone)}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-lg font-bold">
                    <span aria-hidden>{CHARACTERS[k].emoji}</span> {CHARACTERS[k].name}
                  </p>
                  <DefaultRadio name="character-default" checked={value.default === k} onChange={() => onChange({ ...value, default: k })} />
                </div>
                <p className="text-xs text-muted">{CHARACTERS[k].traits}</p>
                <div className="mt-3 space-y-3">
                  <Field label="Giọng điệu (gửi cho trợ lý)">
                    <textarea value={value.items[k].tone} onChange={(e) => setItem(k, "tone", e.target.value)} rows={3} maxLength={400} className={input} />
                  </Field>
                  <Field label="Câu giới thiệu (học sinh thấy)">
                    <textarea value={value.items[k].intro} onChange={(e) => setItem(k, "intro", e.target.value)} rows={3} maxLength={300} className={input} />
                  </Field>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <SaveBar pending={pending} status={status} settingKey="style.characters" />
          </div>
        </Section>
      </form>
      {history}
    </div>
  );
}

function OptionsBox<K extends string>({
  settingKey,
  title,
  description,
  keys,
  labels,
  caps,
  value,
  onChange,
  history,
}: {
  settingKey: SettingKey;
  title: string;
  description: string;
  keys: readonly K[];
  labels: Record<K, { label: string; hint: string }>;
  caps?: (k: K) => string;
  value: OptionSettings<K>;
  onChange: (v: OptionSettings<K>) => void;
  history: ReactNode;
}) {
  const { pending, status, run } = useAction();
  return (
    <div className="space-y-3">
      <form action={() => run(() => saveSettingAction(settingKey, value))}>
        <Section title={title} description={description}>
          <div className="space-y-4">
            {keys.map((k) => (
              <div key={k} className="rounded-2xl border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    {labels[k].label} <span className="font-normal text-muted">· {labels[k].hint}</span>
                  </p>
                  <DefaultRadio name={`${settingKey}-default`} checked={value.default === k} onChange={() => onChange({ ...value, default: k })} />
                </div>
                {caps && <p className="mt-1 text-xs font-semibold text-muted">🔒 {caps(k)} (máy chủ giữ cố định)</p>}
                <textarea
                  value={value.items[k]}
                  onChange={(e) => onChange({ ...value, items: { ...value.items, [k]: e.target.value } })}
                  rows={3}
                  maxLength={600}
                  aria-label={`Câu hướng dẫn: ${labels[k].label}`}
                  className={cn(input, "mt-2")}
                />
              </div>
            ))}
          </div>
          <div className="mt-4">
            <SaveBar pending={pending} status={status} settingKey={settingKey} />
          </div>
        </Section>
      </form>
      {history}
    </div>
  );
}
