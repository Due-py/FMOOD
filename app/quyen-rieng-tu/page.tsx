import type { Metadata } from "next";
import Link from "next/link";
import { CharacterAvatar } from "@/components/mascot/CharacterAvatar";
import { card } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Quyền riêng tư" };

// Thông báo quyền riêng tư cho học sinh và phụ huynh (trang công khai, không cần đăng nhập).
// Mỗi câu phải đúng với cách ứng dụng đang chạy: sửa chức năng nào thì sửa luôn đoạn tương ứng.

const SECTIONS: { title: string; items: string[] }[] = [
  {
    title: "F-Mood lưu những gì",
    items: [
      "Biệt danh, mã lớp và họ tên. Họ tên chỉ để thầy cô hỗ trợ đúng người khi có chuyện khẩn cấp.",
      "Check-in cảm xúc, cuộc trò chuyện với trợ lý AI, nhân vật và cách trò chuyện bạn chọn, chuyện bận lòng bạn chọn lưu (chủ đề, mức lo, ghi chú), việc nhỏ, thói quen và khu vườn.",
      "Câu trả lời bài tập, phiếu khảo sát và lời hẹn bạn gửi thầy cô.",
    ],
  },
  {
    title: "Ai xem được gì",
    items: [
      "Bạn xem được toàn bộ dữ liệu của mình. Bạn bè không xem được gì của bạn.",
      "Giáo viên chủ nhiệm xem danh sách lớp, số liệu chung của lớp (ẩn khi dưới 5 bạn), lời hẹn bạn gửi riêng cho thầy cô, và biết bạn nào cần được quan tâm khi có cảnh báo, nhưng không đọc được nội dung cảnh báo.",
      "Phòng tham vấn (và quản trị viên của trường) đọc lời hẹn gửi phòng tham vấn. Khi có dấu hiệu nguy hiểm, phòng tham vấn đọc đúng đoạn đáng lo đó, không đọc các cuộc trò chuyện khác của bạn.",
    ],
  },
  {
    title: "Thông tin gửi cho AI",
    items: [
      "Trợ lý trò chuyện là một nhân vật AI do bạn chọn (Sóc, Cú hoặc Kiến), dùng dịch vụ AI của OpenAI. Mỗi lượt, trợ lý nhận biệt danh, tin nhắn của bạn, tối đa 20 tin gần nhất trong cuộc trò chuyện, và chủ đề, mức lo của chuyện bạn đang kể. Trợ lý không nhận họ tên thật của bạn.",
      "Tin nhắn cũng được một AI khác kiểm tra để phát hiện dấu hiệu nguy hiểm.",
      "Nhóm đã tắt chế độ lưu hội thoại để dùng lại của dịch vụ AI; nhà cung cấp vẫn có thể giữ tạm theo chính sách chống lạm dụng của họ.",
    ],
  },
  {
    title: "Khi nào thầy cô được báo",
    items: [
      "Khi điều bạn viết (trò chuyện, bài tập, phiếu khảo sát, lời hẹn) có dấu hiệu bạn đang gặp nguy hiểm.",
      "Khi bạn chọn cảm xúc nặng lòng nhiều ngày liền, hoặc báo một chuyện đang nặng hơn ở mức lo cao nhất.",
      "Khi bạn bấm “Báo thầy cô ngay” ở trang Cần giúp.",
      "Email gửi thầy cô chỉ báo có việc cần xem, không chứa nội dung bạn viết. Trợ lý chỉ nói “thầy cô đã được báo” khi cảnh báo đã được ghi thật.",
    ],
  },
  {
    title: "Xóa dữ liệu",
    items: [
      "Bạn tự xóa được từng cuộc trò chuyện, từng chuyện bận lòng, hoặc cả tài khoản (Tôi → Cài đặt → Xóa tài khoản).",
      "Cảnh báo an toàn đã gửi thầy cô được nhà trường giữ lại kể cả khi bạn xóa tài khoản, để còn theo dõi và hỗ trợ bạn.",
      "Với lớp tham gia dùng thử: sau khi đợt thử kết thúc, tài khoản và dữ liệu của lớp được xóa trong vòng 30 ngày (trừ cảnh báo an toàn do nhà trường quản lý), trừ khi nhà trường và phụ huynh đồng ý khác.",
    ],
  },
];

/** Thông báo quyền riêng tư: F-Mood lưu gì, ai xem được gì, gửi gì cho AI, khi nào thầy cô được báo, xóa thế nào. */
export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <CharacterAvatar size={80} mood="calm" />
      <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight">Quyền riêng tư của bạn</h1>
      <p className="mt-3 text-muted">
        F-Mood là công cụ hỗ trợ của nhóm học sinh The Crusaders (lớp 8A1, FSchool Bắc Giang), không phải chuyên gia tâm
        lý. Trang này nói rõ F-Mood làm gì với thông tin của bạn. Có điều gì chưa rõ, bạn hoặc bố mẹ hãy hỏi giáo viên
        hướng dẫn hoặc phòng tham vấn của trường.
      </p>

      <div className="mt-8 space-y-4">
        {SECTIONS.map((s) => (
          <section key={s.title} className={card}>
            <h2 className="font-display text-xl font-bold tracking-tight">{s.title}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
              {s.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-8 text-sm text-muted">
        <Link href="/" className="font-semibold underline underline-offset-4">
          Về trang đầu
        </Link>
      </p>
    </main>
  );
}
