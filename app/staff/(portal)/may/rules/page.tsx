import type { Metadata } from "next";
import { requirePage } from "@/lib/permissions";
import { SettingHistory } from "@/components/admin/SettingHistory";
import { getStyleSettings } from "@/lib/assistant";
import { suggestableSkillNames } from "@/lib/skills";
import { getSetting, getSettingMeta } from "@/lib/settings";
import { PageHeader } from "@/components/PageHeader";
import { RulesForm } from "./RulesForm";
import { SelEngineSwitch } from "./SelEngineSwitch";
import { Section } from "@/components/admin/AdminUI";
import { MOVE_LABEL, SEL_MOVES } from "@/lib/sel/engine";

export const metadata: Metadata = { title: "Lời dặn" };

/**
 * Lời dặn chia phần (kế hoạch Demo 3, Bước 10.2): bốn ô admin sửa (an toàn, nói chuyện chung, QT, gợi ý và kết thúc),
 * và ô xem nguyên văn lời dặn máy chủ ghép cho một tổ hợp nhân vật và lựa chọn.
 */
export default async function RulesPage() {
  await requirePage("/staff/may/rules");
  const [safety, talk, rules, cards, styles, meta, engine] = await Promise.all([
    getSetting("ai.safety"),
    getSetting("ai.talk"),
    getSetting("ai.rules"),
    getSetting("ai.cards"),
    getStyleSettings(),
    getSettingMeta("ai.rules"),
    getSetting("sel.engine"),
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
      <Section
        title="Bộ điều phối SEL trong trò chuyện"
        description="Mặc định là trò chuyện thường: chào hỏi, chuyện vui, chuyện phiếm không bị dẫn theo các bước. Khi học sinh kể một chuyện khó, trợ lý lắng nghe rồi hỏi bạn ấy muốn cùng gỡ từng bước hay chỉ muốn kể cho nhẹ lòng; đồng ý mới vào mạch (tự xin cách làm, muốn nhờ thầy cô, kể đã thử thì vào thẳng). Không nhận lời thì trợ lý chỉ lắng nghe, vài lượt sau mới mời lại. Trong mạch, mỗi lượt AI nhận diện học sinh vừa nói gì (cùng lần kiểm tra an toàn), máy chủ chọn MỘT bước theo quy tắc có test (lib/sel/engine.ts) rồi thêm dòng LƯỢT NÀY vào cuối lời dặn. Chỉ lưu lời học sinh tự nói và mã bước. Tắt nếu trò chuyện chậm hoặc có lỗi; an toàn và giới hạn một câu hỏi vẫn chạy ở mọi chế độ."
      >
        <SelEngineSwitch enabled={engine.enabled} />
        <p className="mt-3 text-sm text-muted">
          Các bước: {SEL_MOVES.filter((m) => m !== "mo").map((m) => MOVE_LABEL[m]).join(" · ")}.
        </p>
      </Section>
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
