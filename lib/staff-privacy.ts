import type { Role } from "@/lib/auth";

// QUYỀN RIÊNG TƯ Ở TRANG THẦY CÔ (dùng chung, có test)
//  - Số liệu nhóm: dưới MIN_GROUP bạn thì ẩn, để không đoán ra được ai.
//  - Giáo viên chủ nhiệm biết bạn nào cần quan tâm, nhưng không đọc nội dung tin nhắn,
//    lý do (rút ra từ nội dung) hay ghi chú xử lý của đồng nghiệp. Phòng tham vấn xử lý.

/** Số học sinh tối thiểu để hiện một con số về nhóm. */
export const MIN_GROUP = 5;

/** Trả về số nếu nhóm đủ lớn, ngược lại null (giao diện hiện "ẩn"). */
export function hideSmall(n: number): number | null {
  return n >= MIN_GROUP ? n : null;
}

type AlertContent = { excerpt: string | null; reasons: string[]; note: string | null };

/**
 * Đoạn trích của cảnh báo từ bài đo kỹ năng bắt đầu bằng dấu này. Chỉ phòng tham vấn đọc:
 * admin là thành viên nhóm, học cùng lớp với học sinh, nên không được đọc bài đo (kế hoạch Demo 3, mục 6.7).
 */
export const TEST_ALERT_PREFIX = "[Bài đo kỹ năng]";

/** Cắt bỏ phần nội dung của cảnh báo trước khi gửi cho người không được đọc. */
export function alertForViewer<T extends AlertContent>(alert: T, role: Role): T & { contentHidden: boolean } {
  if (role === "teacher") return { ...alert, excerpt: null, reasons: [], note: null, contentHidden: true };
  if (role !== "counselor" && alert.excerpt?.startsWith(TEST_ALERT_PREFIX)) return { ...alert, excerpt: null, reasons: [], contentHidden: true };
  return { ...alert, contentHidden: false };
}

/**
 * Phòng tham vấn và admin xử lý cảnh báo (đổi được mọi trạng thái, để Hoàn tác được).
 * Giáo viên chỉ xem trạng thái: nếu giáo viên bấm "đang xử lý", phòng tham vấn dễ tưởng đã có người lo.
 */
export function canHandleAlerts(role: Role): boolean {
  return role === "counselor" || role === "admin";
}
