import type { Metadata } from "next";
import { requirePage } from "@/lib/permissions";
import { SettingHistory } from "@/components/admin/SettingHistory";
import { getStyleSettings } from "@/lib/assistant";
import { suggestableSkillNames } from "@/lib/skills";
import { getSetting, getSettingMeta } from "@/lib/settings";
import { PageHeader } from "@/components/PageHeader";
import { RulesForm } from "./RulesForm";

export const metadata: Metadata = { title: "Lời dặn" };

/**
 * Lời dặn chia phần (kế hoạch Demo 3, Bước 10.2): bốn ô admin sửa (an toàn, nói chuyện chung, QT, gợi ý và kết thúc),
 * và ô xem nguyên văn lời dặn máy chủ ghép cho một tổ hợp nhân vật và lựa chọn.
 */
export default async function RulesPage() {
  await requirePage("/staff/may/rules");
  const [safety, talk, rules, cards, styles, meta] = await Promise.all([
    getSetting("ai.safety"),
    getSetting("ai.talk"),
    getSetting("ai.rules"),
    getSetting("ai.cards"),
    getStyleSettings(),
    getSettingMeta("ai.rules"),
  ]);
  const initial = { safety: safety.text, talk: talk.text, rules: rules.text, cards: cards.text };
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Trợ lý AI" title="Lời dặn">
        <p className="mt-2 max-w-2xl text-sm text-muted">
          “Luật chơi” trợ lý luôn làm theo, chia thành các phần. Máy chủ ghép theo thứ tự: mở đầu, nguyên tắc an toàn, cách nói
          chuyện chung, phong cách học sinh chọn, quy tắc QT và hướng dẫn luyện HL, gợi ý và kết thúc, kỹ năng có thể gợi ý, bối
          cảnh từng lượt, và cuối cùng là giới hạn khóa (không sửa được). Khi phong cách mâu thuẫn với quy tắc thì quy tắc thắng.
          {meta.updatedBy && ` Quy tắc QT sửa lần cuối bởi ${meta.updatedBy}.`}
        </p>
      </PageHeader>
      <RulesForm
        initial={initial}
        styles={styles}
        skills={suggestableSkillNames()}
        histories={{
          safety: <SettingHistory settingKey="ai.safety" />,
          talk: <SettingHistory settingKey="ai.talk" />,
          rules: <SettingHistory settingKey="ai.rules" />,
          cards: <SettingHistory settingKey="ai.cards" />,
        }}
      />
    </div>
  );
}
