// NHẬT KÝ HOẠT ĐỘNG: phần dùng chung (hàm thuần, không đọc cơ sở dữ liệu, có test: audit-shared.test.ts).
// Kế hoạch Demo 3, Bước 12. Nhật ký thầy cô = bảng admin_audit; nhật ký học sinh = student_activity_log.

/** Loại thao tác của thầy cô (cột admin_audit.kind). Chỉ thêm loại mới ở đây. */
export const AUDIT_KINDS = {
  login: "Đăng nhập",
  alert_view: "Xem nội dung cảnh báo",
  alert_handle: "Xử lý cảnh báo",
  help_view: "Xem lời nhờ",
  help_reply: "Trả lời, xử lý lời nhờ",
  content: "Nội dung cho học sinh",
  setting: "Cài đặt, lời dặn",
  export: "Xuất dữ liệu",
  account: "Tài khoản, lớp",
  grading: "Chấm bài",
  permission: "Phân quyền",
  log: "Nhật ký học sinh",
  demo: "Trình diễn",
  other: "Khác",
} as const;

export type AuditKind = keyof typeof AUDIT_KINDS;

export function isAuditKind(v: unknown): v is AuditKind {
  return typeof v === "string" && v in AUDIT_KINDS;
}

const SETTING_ACTIONS = new Set(["Sửa", "Khôi phục mặc định", "Dùng lại bản trước"]);

/**
 * Đoán loại thao tác cho dòng nhật ký cũ (ghi trước migration 0019, chưa có cột kind)
 * và cho các chỗ gọi audit() chưa ghi loại.
 */
export function inferAuditKind(action: string): AuditKind {
  const a = action.toLowerCase();
  if (SETTING_ACTIONS.has(action)) return "setting";
  if (a.includes("trình diễn") || a.includes("dữ liệu mẫu")) return "demo";
  if (a.includes("nhật ký")) return "log";
  if (a.includes("đăng nhập")) return "login";
  if (a.includes("xuất") || a.includes("tải csv")) return "export";
  if (a.includes("cảnh báo")) return a.includes("xem") ? "alert_view" : "alert_handle";
  if (a.includes("lời nhờ")) return a.includes("xem") ? "help_view" : "help_reply";
  if (a.includes("chấm") || a.includes("khóa điểm") || a.includes("ghép mã")) return "grading";
  if (a.includes("phân quyền") || a.includes("quyền trang")) return "permission";
  if (["mật khẩu", "tài khoản", "vai trò", "lớp thử", "chuyển lớp", "mã lớp"].some((w) => a.includes(w))) return "account";
  if (a.includes("lời dặn") || a.includes("nhân vật") || a.includes("tùy chọn trò chuyện") || a.includes("dạy lại")) return "setting";
  if (
    ["bài", "phiếu", "tài liệu", "câu", "cây", "kịch bản", "vòng hỗ trợ", "duyệt", "thử thách", "nguồn"].some((w) => a.includes(w))
  )
    return "content";
  return "other";
}

/** Loại của một dòng nhật ký: cột kind nếu có, không thì đoán từ tên thao tác. */
export function auditKindOf(row: { kind?: string | null; action: string }): AuditKind {
  return isAuditKind(row.kind) ? row.kind : inferAuditKind(row.action);
}

// ───────── Mã học sinh trong nhật ký (không hiện họ tên) ─────────

/** Phần lớp trong mã: tên lớp viết liền, không dấu, chữ hoa (ví dụ "8A1"). */
export function classTag(name: string | null | undefined): string {
  const tag = (name ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "D")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
  return tag || "LOP";
}

/**
 * Mã cố định cho mỗi học sinh, dạng HS-8A1-07: lớp + số thứ tự trong lớp theo thời điểm tạo tài khoản
 * (cùng lúc thì theo id). Học sinh mới vào lớp nhận số tiếp theo, mã của các bạn cũ không đổi.
 * Hai lớp trùng tên thì lớp sau thêm chữ B, C… để mã không trùng.
 */
export function studentCodes(
  students: { id: string; class_id: string | null; created_at: string }[],
  classes: { id: string; name: string | null }[],
): Map<string, string> {
  const tags = new Map<string, string>();
  const used = new Set<string>();
  for (const c of [...classes].sort((a, b) => a.id.localeCompare(b.id))) {
    const base = classTag(c.name);
    let tag = base;
    for (let i = 1; used.has(tag); i++) tag = `${base}${String.fromCharCode(65 + i)}`;
    used.add(tag);
    tags.set(c.id, tag);
  }
  const byClass = new Map<string, typeof students>();
  for (const s of students) {
    const key = s.class_id && tags.has(s.class_id) ? s.class_id : "";
    byClass.set(key, [...(byClass.get(key) ?? []), s]);
  }
  const codes = new Map<string, string>();
  for (const [classId, list] of byClass) {
    const tag = classId ? (tags.get(classId) as string) : "KHONGLOP";
    list
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
      .forEach((s, i) => codes.set(s.id, `HS-${tag}-${String(i + 1).padStart(2, "0")}`));
  }
  return codes;
}

export const STUDENT_CODE_RE = /^HS-[A-Z0-9]{2,12}-\d{2,4}$/;

/** Bảng dữ liệu → chữ CSV (mở được bằng Excel, có BOM để đọc đúng tiếng Việt khi tải về). */
export function toCsv(rows: (string | number | null)[][]): string {
  return rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
}
