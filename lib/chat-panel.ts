// Panel phải trang Học cùng AI (≥ 1280px) mở hay thu gọn lên trên (chỉ còn thanh thẻ): nhớ bằng cookie để máy chủ vẽ đúng
// ngay lần đầu (không nháy panel rồi mới thu lại). Chưa có cookie (lần đầu mở) = panel MỞ ở thẻ Ghi chú (Duy 01/11 tối;
// trước đó chưa có cookie là thu gọn); học sinh đã tự thu gọn ("dong") thì lần sau vẫn thu gọn.

export const CHAT_PANEL_COOKIE = "fm_chat_panel";
const YEAR = 400 * 24 * 60 * 60;

export function chatPanelOpen(value: string | undefined): boolean {
  return value !== "dong";
}

export function setChatPanelOpen(open: boolean) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CHAT_PANEL_COOKIE}=${open ? "mo" : "dong"}; Path=/; SameSite=Lax; Max-Age=${YEAR}${secure}`;
}
