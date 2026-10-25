// Soạn email báo thầy cô (tách riêng, không phụ thuộc server, để kiểm thử được: notify.test.ts).
import type { AlertInput } from "./alerts";

const TYPE_LABEL: Record<AlertInput["type"], string> = {
  chat_risk: "khi trò chuyện với Mây",
  lesson_risk: "khi làm bài tập",
  help_request: "học sinh tự bấm nhờ thầy cô giúp",
  negative_streak: "cảm xúc nặng lòng nhiều ngày liền",
  worry_worse: "Mây hỏi thăm, học sinh thấy nặng hơn và lo rất nhiều",
};

/** Có gửi email cho cảnh báo này không: mức khẩn, học sinh tự nhờ giúp, hoặc thấy nặng hơn khi Mây hỏi thăm. */
export function shouldEmail(alert: Pick<AlertInput, "severity" | "type">): boolean {
  return alert.severity === "urgent" || alert.type === "help_request" || alert.type === "worry_worse";
}

/**
 * Soạn email. Cố ý chỉ lấy những trường được phép: KHÔNG dùng `excerpt`, `reasons`
 * hay họ tên thật (có bài test trong notify.test.ts bảo đảm điều này).
 */
export function buildAlertEmail(
  alert: AlertInput,
  ctx: { className: string | null; appUrl: string | null; at: Date },
): { subject: string; text: string } {
  const level = alert.severity === "urgent" ? "KHẨN" : "Cần để ý";
  const time = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(ctx.at);
  const where = ctx.className ? `lớp ${ctx.className}` : "chưa có lớp";
  const link = ctx.appUrl ? `${ctx.appUrl.replace(/\/$/, "")}/staff/alerts` : "trang thầy cô của F-Mood";
  return {
    subject: `[F-Mood] Cảnh báo ${level}: học sinh ${alert.profile.nickname} (${where})`,
    text: [
      `F-Mood vừa ghi nhận một cảnh báo mức ${level} lúc ${time}.`,
      ``,
      `Học sinh: ${alert.profile.nickname} (${where})`,
      `Nguồn: ${TYPE_LABEL[alert.type]}`,
      ``,
      `Vì quyền riêng tư của học sinh, email này không kèm nội dung tin nhắn.`,
      `Thầy cô vui lòng đăng nhập để xem và xử lý: ${link}`,
      ``,
      `Nếu học sinh có thể đang gặp nguy hiểm ngay lúc này, hãy liên hệ trực tiếp với học sinh / gia đình hoặc gọi 115.`,
    ].join("\n"),
  };
}
