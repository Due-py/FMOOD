// Danh mục tính năng của trang thầy cô (dùng cho thanh điều hướng và Bàn làm việc).
import type { Role } from "@/lib/auth";

export type NavItem = {
  href: string;
  label: string;
  emoji: string;
  description: string;
  roles: Role[];
};

export type NavGroup = { title: string; tone: string; items: NavItem[] };

const ALL_STAFF: Role[] = ["teacher", "counselor", "admin"];
const ADMIN: Role[] = ["admin"];
const ADMIN_COUNSELOR: Role[] = ["admin", "counselor"];

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "An toàn",
    tone: "bg-peach",
    items: [
      { href: "/staff/alerts", label: "Cảnh báo", emoji: "🛟", description: "Học sinh cần được quan tâm", roles: ALL_STAFF },
      { href: "/staff/safety/risk", label: "Phát hiện rủi ro", emoji: "🔎", description: "Cụm từ nguy hiểm, tiêu chí AI, thử một câu", roles: ADMIN },
      { href: "/staff/safety/emergency", label: "Khẩn cấp", emoji: "🚨", description: "Câu trả lời soạn sẵn và số hỗ trợ", roles: ADMIN },
    ],
  },
  {
    title: "Nội dung",
    tone: "bg-butter",
    items: [
      { href: "/staff/content/lessons", label: "Thư viện bài học", emoji: "📚", description: "Soạn và đăng bài well-being", roles: ADMIN },
      { href: "/staff/content/prompts", label: "Câu hỏi & gợi ý", emoji: "💡", description: "Câu mở đầu chat, câu hỏi suy ngẫm", roles: ADMIN },
      { href: "/staff/content/garden", label: "Khu vườn", emoji: "🌻", description: "Loại cây và số giọt nước", roles: ADMIN },
      { href: "/staff/content/vong-ho-tro", label: "Vòng hỗ trợ", emoji: "🌈", description: "Duyệt chủ đề, việc nhỏ, lời của Mây", roles: ADMIN_COUNSELOR },
    ],
  },
  {
    title: "Mây",
    tone: "bg-sky",
    items: [
      { href: "/staff/may/rules", label: "Lời dặn", emoji: "📜", description: "Vai trò và giới hạn của Mây", roles: ADMIN },
      { href: "/staff/may/persona", label: "Nhân vật", emoji: "☁️", description: "Tên, tính cách, cách xưng hô", roles: ADMIN },
      { href: "/staff/may/scenarios", label: "Kịch bản", emoji: "🧭", description: "Cách Mây xử lý từng chủ đề", roles: ADMIN },
      { href: "/staff/may/knowledge", label: "Kho kiến thức", emoji: "🗂️", description: "Tài liệu cho Mây tra cứu", roles: ADMIN },
      { href: "/staff/may/health", label: "Tình trạng Mây", emoji: "🩺", description: "Kết nối, model, lượt dùng, lỗi", roles: ADMIN },
    ],
  },
  {
    title: "Lớp và người",
    tone: "bg-mint",
    items: [
      { href: "/staff/members", label: "Thành viên", emoji: "👥", description: "Tài khoản thầy cô và học sinh", roles: ADMIN },
      { href: "/staff/classes", label: "Tình hình lớp", emoji: "🏫", description: "Lớp học và thống kê ẩn danh", roles: ALL_STAFF },
    ],
  },
  {
    title: "Nghiên cứu",
    tone: "bg-lilac",
    items: [
      { href: "/staff/research", label: "Kết quả nghiên cứu", emoji: "📈", description: "Số liệu ẩn danh cho dự án", roles: ADMIN_COUNSELOR },
      { href: "/staff/surveys", label: "Phiếu khảo sát", emoji: "📋", description: "Tạo phiếu, xem kết quả", roles: ADMIN },
      { href: "/staff/eval", label: "Bộ thử của Mây", emoji: "🧪", description: "Kiểm tra Mây nhận ra rủi ro đúng không", roles: ADMIN },
    ],
  },
];

export function navForRole(role: Role): NavGroup[] {
  return NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) })).filter(
    (g) => g.items.length > 0,
  );
}
