// DẤU HIỆU AN TOÀN VÀ BẢNG QUY TẮC XẾP MỨC (hàm thuần, có test: signals.test.ts).
//
// Cách làm (sửa tổng thể 31/10, thay cho việc AI tự chọn none / concern / urgent):
//  1. AI phân loại CHỈ đánh dấu các dấu hiệu dưới đây (có / không), cộng mức căng thẳng (trục 2).
//  2. Máy chủ xếp mức nguy cơ theo BẢNG QUY TẮC này. Muốn đổi chính sách thì sửa bảng (cô Thúy duyệt), không viết lại lời dặn.
//
// Chuyện buồn thường ngày xảy ra MỘT LẦN (bị chê, bị trêu, bị mắng, cãi nhau, điểm kém, bị nói xấu một lần)
// KHÔNG phải dấu hiệu nào: mức "bình thường"; trợ lý vẫn đồng cảm, mức căng thẳng quyết định giọng và khung liên hệ.
// AN TOÀN HAI TRỤC: mức căng thẳng KHÔNG bao giờ làm đổi mức nguy cơ (test).
import type { RiskLevel } from "./keywords";

export type SelfHarm = "none" | "hint" | "explicit";
export type Stress = "nhe" | "vua" | "nang";

export type Signals = {
  /** ý nghĩ / ý định / kế hoạch tự tử, tự làm hại: "hint" = ám chỉ, vòng vo; phân vân cũng chọn "hint" */
  self_harm: SelfHarm;
  /** đang bị bạo hành, xâm hại tình dục, bị ép hoặc dụ gửi ảnh riêng tư */
  abuse: boolean;
  /** đang trong nguy hiểm ngay lúc này */
  danger_now: boolean;
  /** có ý định làm hại người khác nghiêm trọng */
  harm_others: boolean;
  /** bị trêu chọc, chê bai, làm nhục, nói xấu LẶP LẠI hoặc kéo dài; hoặc học sinh tự gọi là bị bắt nạt */
  bullied_repeatedly: boolean;
  /** bị làm nhục công khai: ảnh chế, tin đồn, clip bị đăng / phát tán cho nhiều người */
  humiliated_publicly: boolean;
  /** bị đe dọa, tống tiền, chặn đường, bị đánh (kể cả một lần) */
  threatened_or_hit: boolean;
  /** bị cô lập, tẩy chay, cả nhóm / cả lớp không chơi cùng kéo dài */
  excluded: boolean;
  /** sợ, không dám đến trường hoặc về nhà; thấy không an toàn ở đó */
  feels_unsafe: boolean;
  /** tuyệt vọng, thấy mình vô dụng / là gánh nặng, khóc nhiều ngày liền: kéo dài, không phải một lúc */
  hopeless: boolean;
  /** nhịn ăn, ép cân, nôn sau ăn có dấu hiệu nguy hại */
  eating_harm: boolean;
  /** TRỤC 2, mức ảnh hưởng của căng thẳng (không đổi mức nguy cơ) */
  stress: Stress;
};

export const NO_SIGNALS: Signals = {
  self_harm: "none",
  abuse: false,
  danger_now: false,
  harm_others: false,
  bullied_repeatedly: false,
  humiliated_publicly: false,
  threatened_or_hit: false,
  excluded: false,
  feels_unsafe: false,
  hopeless: false,
  eating_harm: false,
  stress: "nhe",
};

export type SignalRule = { id: string; level: Exclude<RiskLevel, "none">; label: string; when: (s: Signals) => boolean };

/** BẢNG QUY TẮC: có một dòng khớp là lấy mức cao nhất trong các dòng khớp. Không dòng nào khớp: bình thường. */
export const SIGNAL_RULES: SignalRule[] = [
  { id: "tu-hai-ro", level: "urgent", label: "Nói rõ ý nghĩ / ý định tự tử, tự làm hại", when: (s) => s.self_harm === "explicit" },
  { id: "tu-hai-am-chi", level: "urgent", label: "Ám chỉ tự tử, tự làm hại", when: (s) => s.self_harm === "hint" },
  { id: "bao-hanh", level: "urgent", label: "Đang bị bạo hành, xâm hại hoặc bị ép gửi ảnh riêng tư", when: (s) => s.abuse },
  { id: "nguy-hiem", level: "urgent", label: "Đang trong nguy hiểm", when: (s) => s.danger_now },
  { id: "hai-nguoi", level: "urgent", label: "Có ý định làm hại người khác nghiêm trọng", when: (s) => s.harm_others },
  { id: "bat-nat", level: "concern", label: "Bị trêu chọc, làm nhục lặp lại (bắt nạt)", when: (s) => s.bullied_repeatedly },
  { id: "lam-nhuc", level: "concern", label: "Bị làm nhục công khai (ảnh chế, tin đồn bị phát tán)", when: (s) => s.humiliated_publicly },
  { id: "de-doa", level: "concern", label: "Bị đe dọa, tống tiền hoặc bị đánh", when: (s) => s.threatened_or_hit },
  { id: "co-lap", level: "concern", label: "Bị cô lập, tẩy chay kéo dài", when: (s) => s.excluded },
  { id: "khong-an-toan", level: "concern", label: "Sợ, không dám đến trường hoặc về nhà", when: (s) => s.feels_unsafe },
  { id: "tuyet-vong", level: "concern", label: "Tuyệt vọng, thấy mình vô dụng kéo dài", when: (s) => s.hopeless },
  { id: "an-uong", level: "concern", label: "Nhịn ăn, ép cân có dấu hiệu nguy hại", when: (s) => s.eating_harm },
];

const ORDER: Record<RiskLevel, number> = { none: 0, concern: 1, urgent: 2 };

/** Xếp mức nguy cơ từ dấu hiệu theo bảng quy tắc. Lý do = nhãn các dòng khớp (mức cao trước). */
export function levelFromSignals(s: Signals): { level: RiskLevel; reasons: string[] } {
  const hits = SIGNAL_RULES.filter((r) => r.when(s));
  if (!hits.length) return { level: "none", reasons: [] };
  const level = hits.reduce<RiskLevel>((acc, r) => (ORDER[r.level] > ORDER[acc] ? r.level : acc), "none");
  return { level, reasons: [...hits].sort((a, b) => ORDER[b.level] - ORDER[a.level]).map((r) => r.label) };
}

export const STRESS_LABEL: Record<Stress, string> = { nhe: "nhẹ", vua: "vừa", nang: "nặng" };
