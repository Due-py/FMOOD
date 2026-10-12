// "Nhớ tài khoản": dùng chung cho trình duyệt, server và proxy.
//
// Supabase mặc định ghi cookie phiên với hạn 400 ngày. Nếu người dùng KHÔNG tick
// "Nhớ tài khoản", ta bỏ hạn đó đi để cookie thành cookie phiên trình duyệt:
// đóng trình duyệt là phải đăng nhập lại (hợp với máy dùng chung ở trường).

export const REMEMBER_COOKIE = "fm_remember";
const YEAR = 400 * 24 * 60 * 60;

type CookieOptions = { maxAge?: number; expires?: Date; [key: string]: unknown };

/** Chưa có cookie (tài khoản đăng nhập từ trước khi có nút này) thì coi như nhớ. */
export function wantsRemember(value: string | undefined): boolean {
  return value !== "0";
}

/** Bỏ hạn dùng của cookie khi không nhớ (giữ nguyên cookie xóa, maxAge = 0). */
export function applyRemember<T extends CookieOptions>(options: T | undefined, remember: boolean): T | undefined {
  if (remember || !options || options.maxAge === 0) return options;
  const rest = { ...options };
  delete rest.maxAge;
  delete rest.expires;
  return rest;
}

// ───────────── Trình duyệt ─────────────

/** Ghi lựa chọn trước khi đăng nhập, để mọi cookie phiên sau đó theo đúng lựa chọn. */
export function setRememberChoice(remember: boolean) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${REMEMBER_COOKIE}=${remember ? "1" : "0"}; Path=/; SameSite=Lax${remember ? `; Max-Age=${YEAR}` : ""}${secure}`;
}

const SAVED_KEY = "fmood:saved-login";

export type SavedLogin = { classCode?: string; nickname?: string; email?: string };

/** Chuỗi JSON đã lưu (dùng cho useSyncExternalStore, vì chuỗi so sánh được bằng ===). */
export function readSavedLoginRaw(): string | null {
  try {
    return localStorage.getItem(SAVED_KEY);
  } catch {
    return null;
  }
}

export function parseSavedLogin(raw: string | null): SavedLogin | null {
  try {
    return raw ? (JSON.parse(raw) as SavedLogin) : null;
  } catch {
    return null;
  }
}

/** Biệt danh / mã lớp / email đã lưu để điền sẵn (KHÔNG bao giờ lưu mật khẩu). */
export function readSavedLogin(): SavedLogin | null {
  return parseSavedLogin(readSavedLoginRaw());
}

export function writeSavedLogin(value: SavedLogin | null) {
  try {
    if (value) localStorage.setItem(SAVED_KEY, JSON.stringify(value));
    else localStorage.removeItem(SAVED_KEY);
  } catch {
    // trình duyệt chặn bộ nhớ: bỏ qua, chỉ là tiện ích điền sẵn
  }
}
