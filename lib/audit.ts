import "server-only";
import { after } from "next/server";
import { audit, type AuditMeta } from "@/lib/settings";

// GHI NHẬT KÝ THẦY CÔ KHI MỞ TRANG (xem nội dung cảnh báo, xem lời nhờ...): ghi sau khi đã gửi trang,
// để việc ghi không làm chậm trang. Lỗi thì bỏ qua (đã in ra log máy chủ trong audit()).

export function auditLater(actor: { id: string; nickname: string; role?: string }, action: string, detail?: string, meta?: AuditMeta) {
  try {
    after(() => audit(actor, action, detail, meta));
  } catch {
    void audit(actor, action, detail, meta);
  }
}

/**
 * Thầy cô mở một trang có hiện nội dung cảnh báo (đoạn tin nhắn, lý do): ghi một dòng cho lần mở đó,
 * với số cảnh báo đã hiện nội dung. GVCN không thấy nội dung (alertForViewer) nên không ghi.
 */
export function auditAlertView(
  viewer: { id: string; nickname: string; role?: string },
  alerts: { id: string; contentHidden?: boolean; excerpt?: string | null }[],
  page: string,
) {
  const shown = alerts.filter((a) => !a.contentHidden && a.excerpt);
  if (!shown.length) return;
  auditLater(viewer, "Xem nội dung cảnh báo", `${shown.length} cảnh báo`, {
    kind: "alert_view",
    page,
    targetType: "alert",
    targetId: shown.length === 1 ? shown[0].id : null,
  });
}
