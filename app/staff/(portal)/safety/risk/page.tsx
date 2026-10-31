import type { Metadata } from "next";
import Link from "next/link";
import { requirePage } from "@/lib/permissions";
import { BUILT_IN_RULES } from "@/lib/safety/keywords";
import { SIGNAL_RULES } from "@/lib/safety/signals";
import { SettingHistory } from "@/components/admin/SettingHistory";
import { getSetting, getSettingMeta } from "@/lib/settings";
import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/admin/AdminUI";
import { ClassifierForm, PhrasesForm, RiskTester } from "./RiskForms";

export const metadata: Metadata = { title: "Phát hiện rủi ro" };

export default async function RiskPage() {
  await requirePage("/staff/safety/risk");
  const [phrases, classifier, meta] = await Promise.all([
    getSetting("safety.phrases"),
    getSetting("safety.classifier"),
    getSettingMeta("safety.classifier"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="An toàn" title="Phát hiện rủi ro">
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Mỗi tin nhắn của học sinh được kiểm tra bằng <strong>bộ lọc cụm từ</strong> và <strong>AI phân loại</strong> có
          xét bối cảnh. Chỉ cần một lớp báo là tính. Sau khi sửa, nên chạy{" "}
          <Link href="/staff/eval" className="font-semibold underline">Bộ thử của trợ lý</Link> để chắc không báo nhầm.
        </p>
      </PageHeader>

      <Section title="Thử một câu" description="Gõ một câu như học sinh sẽ nhắn để xem F-Mood đánh giá thế nào. Không lưu, không tạo cảnh báo.">
        <RiskTester />
      </Section>

      <Section
        title="Cụm từ nguy hiểm"
        description="Thêm cụm từ đặc trưng (ví dụ tiếng lóng học sinh hay dùng). Chỉ cần tin nhắn chứa nguyên cụm là bị báo, nên tránh từ quá chung chung."
      >
        <PhrasesForm key={JSON.stringify(phrases)} initial={phrases} />
        <details className="mt-5 rounded-2xl bg-surface-2 p-4 text-sm">
          <summary className="cursor-pointer font-semibold">Nhóm cụm từ có sẵn trong hệ thống ({BUILT_IN_RULES.length})</summary>
          <ul className="mt-3 space-y-1">
            {BUILT_IN_RULES.map((r) => (
              <li key={r.reason}>
                <span className={r.level === "urgent" ? "font-semibold text-danger" : "font-semibold"}>
                  {r.level === "urgent" ? "Khẩn cấp" : "Đáng lo"}
                </span>{" "}
                · {r.reason} <span className="text-muted">({r.count} mẫu)</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-muted">Các mẫu này nằm trong code (lib/safety/keywords.ts) và có test tự động.</p>
        </details>
        <div className="mt-4">
          <SettingHistory settingKey="safety.phrases" />
        </div>
      </Section>

      <Section
        title="Bảng quy tắc xếp mức"
        description="AI không tự chọn mức. AI chỉ đánh dấu các dấu hiệu dưới đây, máy chủ xếp mức theo bảng này (có test tự động). Không dòng nào khớp: bình thường."
      >
        <ul className="space-y-1 text-sm">
          {SIGNAL_RULES.map((r) => (
            <li key={r.id}>
              <span className={r.level === "urgent" ? "font-semibold text-danger" : "font-semibold"}>
                {r.level === "urgent" ? "Khẩn cấp" : "Đáng lo"}
              </span>{" "}
              · {r.label}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">
          Chuyện buồn xảy ra một lần (bị chê, bị trêu, bị mắng, cãi nhau, điểm kém, bị nói xấu một lần) không phải dấu hiệu nào: mức
          bình thường. AI còn cho biết mức căng thẳng (nhẹ / vừa / nặng): mức này chỉ chọn giọng trả lời và hiện khung &ldquo;người
          lắng nghe&rdquo; khi nặng, không bao giờ đổi mức nguy cơ hay báo thầy cô. Đổi bảng này thì sửa lib/safety/signals.ts và chạy
          lại bộ thử an toàn.
        </p>
      </Section>

      <Section
        title="Lời dặn cho AI nhận dấu hiệu"
        description={
          <>
            Hướng dẫn AI đánh dấu dấu hiệu (định nghĩa từng dấu hiệu và luật cố định luôn được thêm vào, không sửa ở đây).
            {meta.updatedBy && ` Sửa lần cuối bởi ${meta.updatedBy}.`}
          </>
        }
      >
        <ClassifierForm key={classifier.prompt} initial={classifier.prompt} />
        <div className="mt-4">
          <SettingHistory settingKey="safety.classifier" />
        </div>
      </Section>
    </div>
  );
}
