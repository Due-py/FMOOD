"use client";

import { useState, type ReactNode } from "react";
import { saveSettingAction } from "@/app/actions/admin";
import { SaveBar, Section, textarea, useAction } from "@/components/admin/AdminUI";
import { MayPlayground } from "@/components/admin/MayPlayground";
import { StyleComboPicker } from "@/components/admin/StyleComboPicker";
import { defaultStyle, type ChatStyle, type StyleSettings } from "@/lib/ai/chat-style";
import { promptParts, type PromptConfig } from "@/lib/ai/prompts";
import type { SettingKey } from "@/lib/settings";

type PartKey = "safety" | "talk" | "rules" | "cards";
type Values = Record<PartKey, string>;

const BOXES: { part: PartKey; key: SettingKey; title: string; description: string; rows: number }[] = [
  {
    part: "safety",
    key: "ai.safety",
    title: "Nguyên tắc an toàn",
    description: "Trợ lý đóng vai trò gì, các nguyên tắc luôn giữ. Để trống được: giới hạn khóa ở cuối lời dặn vẫn luôn có.",
    rows: 8,
  },
  {
    part: "talk",
    key: "ai.talk",
    title: "Cách nói chuyện chung",
    description: "Áp dụng cho mọi nhân vật và mọi lựa chọn của học sinh: xưng hô, số câu hỏi mỗi lượt, emoji…",
    rows: 9,
  },
  {
    part: "rules",
    key: "ai.rules",
    title: "Quy tắc QT",
    description:
      "Quy tắc trò chuyện QT02–QT12 (căn cứ của báo cáo và bộ thử). Hướng dẫn luyện HL01–HL07 luôn được thêm ngay sau phần này. Mỗi lần sửa nên thử nói chuyện ở dưới.",
    rows: 18,
  },
  {
    part: "cards",
    key: "ai.cards",
    title: "Gợi ý và kết thúc",
    description:
      "Ba dòng thẻ trợ lý được thêm ở cuối câu trả lời: [GOAL: …], [SKILL: …], [END: …]. Máy chủ kiểm tra chặt (tên kỹ năng phải khớp nguyên văn, mỗi loại một dòng) và bỏ thẻ ở lượt đáng lo.",
    rows: 14,
  },
];

/** Trang Lời dặn: bốn ô sửa riêng, mỗi ô lưu và khôi phục riêng; xem lời dặn đầy đủ cho một tổ hợp lựa chọn. */
export function RulesForm({
  initial,
  styles,
  skills,
  histories,
}: {
  initial: Values;
  styles: StyleSettings;
  skills: string[];
  histories: Record<PartKey, ReactNode>;
}) {
  const [values, setValues] = useState<Values>(initial);
  // máy chủ trả giá trị mới (lưu, về mặc định, dùng lại bản trước): cập nhật đúng ô đó, giữ các ô đang sửa dở
  const [seen, setSeen] = useState<Values>(initial);
  if (BOXES.some((b) => seen[b.part] !== initial[b.part])) {
    const next = { ...values };
    for (const b of BOXES) if (seen[b.part] !== initial[b.part]) next[b.part] = initial[b.part];
    setSeen(initial);
    setValues(next);
  }
  const [combo, setCombo] = useState<ChatStyle>(() => defaultStyle(styles));
  const config: PromptConfig = { ...values, styles, skills };

  return (
    <div className="space-y-6">
      {BOXES.map((b) => (
        <PartBox
          key={b.part}
          box={b}
          value={values[b.part]}
          onChange={(v) => setValues((cur) => ({ ...cur, [b.part]: v }))}
          history={histories[b.part]}
        />
      ))}

      <MayPlayground parts={values} styles={styles} />

      <details className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <summary className="cursor-pointer font-semibold">Xem lời dặn đầy đủ trợ lý nhận được</summary>
        <p className="mt-2 text-sm text-muted">Chọn một tổ hợp nhân vật và lựa chọn; nội dung dùng các ô đang soạn ở trên (chưa cần lưu).</p>
        <StyleComboPicker value={combo} onChange={setCombo} className="mt-3" />
        <div className="mt-4 space-y-3">
          {promptParts(config, combo, "(biệt danh học sinh)").map((p) => (
            <div key={p.no}>
              <p className="text-xs font-semibold text-muted">
                {p.no}. {p.title} · {p.by}
              </p>
              <pre className="mt-1 max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-2xl bg-surface-2 p-4 font-mono text-xs leading-relaxed">
                {p.text ||
                  (p.no === 8
                    ? "(thêm theo từng lượt: hướng dẫn theo chủ đề, tài liệu tham khảo, điều chỉnh theo 👍/👎, chuyện bận lòng, nút vừa bấm, lượt đáng lo)"
                    : "(đang để trống: không gửi phần này)")}
              </pre>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function PartBox({
  box,
  value,
  onChange,
  history,
}: {
  box: (typeof BOXES)[number];
  value: string;
  onChange: (v: string) => void;
  history: ReactNode;
}) {
  const { pending, status, run } = useAction();
  return (
    <div className="space-y-3">
      <form action={() => run(() => saveSettingAction(box.key, { text: value }))}>
        <Section title={box.title} description={box.description}>
          <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={box.rows} className={textarea} aria-label={box.title} />
          <div className="mt-4">
            <SaveBar pending={pending} status={status} settingKey={box.key} />
          </div>
        </Section>
      </form>
      {history}
    </div>
  );
}
