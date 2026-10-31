// Danh mục công cụ của trang thầy cô (dùng cho thanh bên và trang Hôm nay).
// roles = quyền MẶC ĐỊNH của mỗi trang; admin đổi được ở trang Phân quyền (lib/permissions-shared.ts, Bước 11).
// Thanh bên dùng navFor(); máy chủ của từng trang và thao tác tự chặn bằng requirePage().
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
const TEACHER_ADMIN: Role[] = ["teacher", "admin"];
const TEACHER: Role[] = ["teacher"];

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Tổng quan",
    tone: "bg-sky",
    items: [
      { href: "/staff/tong-quan", label: "Tổng quan app", emoji: "📊", description: "Số liệu gộp mỗi ngày, đợt dùng thử", roles: ADMIN },
    ],
  },
  {
    title: "Việc cần làm",
    tone: "bg-peach",
    items: [
      { href: "/staff/alerts", label: "Cảnh báo", emoji: "🛟", description: "Bạn nào đang cần được quan tâm", roles: ALL_STAFF },
      { href: "/staff/loi-nho", label: "Lời nhờ giúp", emoji: "🙋", description: "Học sinh hẹn nói chuyện với thầy cô", roles: ALL_STAFF },
    ],
  },
  {
    title: "Lớp học",
    tone: "bg-mint",
    items: [
      { href: "/staff/classes", label: "Tình hình lớp", emoji: "🏫", description: "Cảm xúc chung, không gắn với bạn nào", roles: ALL_STAFF },
      { href: "/staff/bai-cho-lop", label: "Bài cho lớp", emoji: "📝", description: "Soạn bài ngắn cho lớp mình", roles: TEACHER_ADMIN },
      { href: "/staff/surveys", label: "Câu hỏi cho lớp", emoji: "❓", description: "Hỏi nhanh cả lớp, xem kết quả chung", roles: TEACHER },
      { href: "/staff/thu-thach", label: "Thử thách", emoji: "🌟", description: "Một việc nhỏ cả lớp cùng làm", roles: TEACHER_ADMIN },
    ],
  },
  {
    title: "Dạy trợ lý",
    tone: "bg-sky",
    items: [
      { href: "/staff/may/rules", label: "Lời dặn", emoji: "📜", description: "Trợ lý làm gì và không bao giờ làm gì", roles: ADMIN },
      { href: "/staff/may/tro-chuyen", label: "Tùy chọn trò chuyện", emoji: "🐿️", description: "Nhân vật, độ dài, cách dẫn dắt, động lực", roles: ADMIN },
      { href: "/staff/may/scenarios", label: "Từng chủ đề", emoji: "🧭", description: "Trợ lý nên trả lời mỗi chủ đề thế nào", roles: ADMIN },
      { href: "/staff/may/knowledge", label: "Tài liệu cho trợ lý", emoji: "🗂️", description: "Tài liệu trợ lý đọc để trả lời đúng", roles: ADMIN },
      { href: "/staff/safety/risk", label: "Nhận ra câu nguy hiểm", emoji: "🔎", description: "Cụm từ nguy hiểm, thử một câu", roles: ADMIN },
      { href: "/staff/safety/emergency", label: "Khi khẩn cấp", emoji: "🚨", description: "Câu trả lời soạn sẵn và số hỗ trợ", roles: ADMIN },
      { href: "/staff/eval", label: "Bộ câu thử", emoji: "🧪", description: "Kiểm tra trợ lý nhận ra câu nguy hiểm", roles: ADMIN },
      { href: "/staff/may/health", label: "Trợ lý có khỏe không", emoji: "🩺", description: "Kết nối, lượt dùng, lỗi", roles: ADMIN },
    ],
  },
  {
    title: "Nội dung cho học sinh",
    tone: "bg-butter",
    items: [
      { href: "/staff/content/lessons", label: "Thư viện bài học", emoji: "📚", description: "Bài chung cho mọi lớp", roles: ADMIN },
      { href: "/staff/content/prompts", label: "Câu hỏi mỗi ngày", emoji: "💡", description: "Câu mở lời và câu hỏi suy ngẫm", roles: ADMIN },
      { href: "/staff/content/garden", label: "Khu vườn", emoji: "🌻", description: "Loại cây và số giọt nước", roles: ADMIN },
      { href: "/staff/content/vong-ho-tro", label: "Vòng hỗ trợ", emoji: "🌈", description: "Duyệt chủ đề, việc nhỏ, lời của trợ lý", roles: ADMIN_COUNSELOR },
      { href: "/staff/content/duyet-bai", label: "Duyệt bài thư viện", emoji: "✅", description: "Bài đã duyệt, chưa duyệt, nguồn của bài", roles: ADMIN_COUNSELOR },
    ],
  },
  {
    title: "Tài khoản và nghiên cứu",
    tone: "bg-lilac",
    items: [
      { href: "/staff/members", label: "Tài khoản", emoji: "👥", description: "Thêm thầy cô, học sinh, đổi vai trò", roles: ADMIN },
      { href: "/staff/nhat-ky", label: "Nhật ký hoạt động", emoji: "🗒️", description: "Ai đã làm gì, lúc nào (chỉ admin)", roles: ADMIN },
      { href: "/staff/phan-quyen", label: "Phân quyền", emoji: "🔐", description: "Nhóm nào được mở trang nào (chỉ admin)", roles: ADMIN },
      { href: "/staff/research/hieu-qua", label: "App có giúp được không", emoji: "🎯", description: "10 chỉ số Đạt / Chưa đạt, in báo cáo", roles: ADMIN_COUNSELOR },
      { href: "/staff/research", label: "Kết quả nghiên cứu", emoji: "📈", description: "Số liệu ẩn danh cho dự án", roles: ADMIN_COUNSELOR },
      { href: "/staff/surveys", label: "Phiếu khảo sát", emoji: "📋", description: "Tạo phiếu, xem kết quả", roles: ADMIN },
      // người chấm là giáo viên / tư vấn viên được admin giao; trang tự báo "chưa được giao" với người khác
      { href: "/staff/cham-bai", label: "Chấm bài", emoji: "✍️", description: "Chấm mù bài đo kỹ năng (người được giao)", roles: ALL_STAFF },
    ],
  },
  {
    title: "Trình diễn",
    tone: "bg-butter",
    items: [
      { href: "/staff/trinh-dien", label: "Trình diễn cho giám khảo", emoji: "🎬", description: "Dữ liệu mẫu, nhìn vào bên trong trợ lý", roles: ADMIN },
    ],
  },
];

export function navForRole(role: Role): NavGroup[] {
  return NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) })).filter(
    (g) => g.items.length > 0,
  );
}
