import type { Metadata } from "next";
import { requirePage } from "@/lib/permissions";
import { SettingHistory } from "@/components/admin/SettingHistory";
import { getStyleSettings } from "@/lib/assistant";
import { getSetting, getSettingMeta } from "@/lib/settings";
import { PageHeader } from "@/components/PageHeader";
import { RulesForm } from "./RulesForm";
import { SelEngineSwitch } from "./SelEngineSwitch";
import { Section } from "@/components/admin/AdminUI";
import { CASEL } from "@/lib/sel/casel";
import { MOVE_CASEL, MOVE_LABEL, SEL_MOVES } from "@/lib/sel/engine";

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
          Đây là những điều trợ lý luôn làm theo khi trò chuyện. Mỗi lượt, máy chủ ghép các phần dưới đây thành một bản dặn gửi cho trợ lý:
          an toàn, cách nói chuyện chung, phong cách bạn học sinh chọn, quy tắc trò chuyện, rồi gợi ý và cách kết thúc. Phần cuối cùng là
          giới hạn cố định, không sửa được. Nếu phong cách bạn chọn mâu thuẫn với quy tắc thì quy tắc thắng.
          {meta.updatedBy && ` Quy tắc trò chuyện sửa lần cuối bởi ${meta.updatedBy}.`}
        </p>
      </PageHeader>
      <Section
        title="Dẫn bạn gỡ chuyện khó từng bước"
        description="Bật thì khi bạn kể một chuyện khó, trợ lý không chỉ trả lời tự do mà dẫn bạn đi từng bước nhỏ, mỗi lượt một bước. Tắt thì trợ lý trò chuyện bình thường."
      >
        <div className="space-y-4 text-sm">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              <b>Chuyện thường thì cứ trò chuyện thường.</b> Chào hỏi, chuyện vui, chuyện phiếm không bị dẫn theo bước nào.
            </li>
            <li>
              <b>Chuyện khó thì trợ lý hỏi trước.</b> Trợ lý lắng nghe, rồi hỏi bạn muốn cùng gỡ từng bước hay chỉ muốn kể cho nhẹ lòng. Bạn
              đồng ý mới bắt đầu. Nếu bạn tự xin cách làm, muốn nhờ thầy cô hoặc kể mình đã thử gì thì bắt đầu luôn.
            </li>
            <li>
              <b>Bạn không muốn thì chỉ lắng nghe.</b> Trợ lý không mời lại với chuyện đó. Chỉ khi bạn kể sang chuyện khó khác, hoặc tự nói
              muốn gỡ, trợ lý mới hỏi lại.
            </li>
            <li>
              <b>Mỗi lượt chỉ một bước.</b> Máy chủ chọn bước tiếp theo bằng quy tắc cố định (đã có bài kiểm tra), không để AI tự quyết. Trước
              khi xem lại suy nghĩ hay đưa cách làm, trợ lý tóm tắt lại điều bạn kể và hỏi “mình hiểu đúng không?”.
            </li>
            <li>
              <b>Chỉ lưu điều bạn tự nói.</b> Gồm ý bạn đã xác nhận, cách bạn chọn, bước nhỏ bạn chốt và việc bạn đã thử. Không lưu suy luận
              của AI.
            </li>
          </ol>
          <p className="text-muted">
            Nếu trò chuyện chậm hoặc bị lỗi thì tắt công tắc này. Dù bật hay tắt, kiểm tra an toàn và giới hạn “mỗi lượt một câu hỏi” vẫn luôn chạy.
          </p>
        </div>
        <div className="mt-4">
          <SelEngineSwitch enabled={engine.enabled} />
        </div>
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-semibold">Xem các bước trợ lý có thể dẫn ({SEL_MOVES.filter((m) => m !== "mo").length} bước)</summary>
          <p className="mt-2 text-muted">Chữ trong ngoặc là năng lực CASEL mà bước đó giúp bạn luyện.</p>
          <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {SEL_MOVES.filter((m) => m !== "mo").map((m) => (
              <li key={m}>
                {MOVE_LABEL[m]}
                {MOVE_CASEL[m].length > 0 && <span className="text-muted"> ({MOVE_CASEL[m].map((c) => CASEL[c].name).join(", ")})</span>}
              </li>
            ))}
          </ul>
        </details>
      </Section>
      <RulesForm
        initial={initial}
        styles={styles}
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
