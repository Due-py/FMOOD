import { redirect } from "next/navigation";

// Trang "Tính cách" cũ (tên, tính cách, số từ, emoji của Mây) đã thay bằng "Tùy chọn trò chuyện" (Bước 9):
// giữ đường dẫn cũ cho ai đã lưu dấu trang.
export default function PersonaPage() {
  redirect("/staff/may/tro-chuyen");
}
