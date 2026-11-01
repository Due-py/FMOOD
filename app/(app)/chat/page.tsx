import { redirect } from "next/navigation";

// Duy 01/11: vào Học cùng AI là mở ngay trò chuyện mới; các cuộc cũ nằm ở thẻ Lịch sử của panel phải (ChatSidePanel.tsx)
export default function ChatIndexPage() {
  redirect("/chat/new");
}
