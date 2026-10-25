import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Đăng xuất rồi chuyển trang. Dùng khi phiên còn cookie nhưng tài khoản
 * không còn hợp lệ (bị khóa, bị xóa), để không bị chuyển trang qua lại mãi.
 *
 * Chỉ đăng xuất khi yêu cầu đến từ chính F-Mood (hoặc người dùng tự gõ địa chỉ).
 * Trang web khác nhúng đường dẫn này (ví dụ <img src=".../signout">) thì bỏ qua,
 * để không ai làm học sinh bị đăng xuất từ xa.
 */
export async function GET(request: NextRequest) {
  const to = request.nextUrl.searchParams.get("to");
  const target = to === "/staff/login" ? "/staff/login" : "/";

  if (isOwnRequest(request)) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL(target, request.url));
}

/** Trình duyệt ghi rõ yêu cầu đến từ đâu (Sec-Fetch-Site); "none" = người dùng tự gõ / bấm dấu trang. */
function isOwnRequest(request: NextRequest): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin" || site === "none";
  // trình duyệt quá cũ không gửi Sec-Fetch-Site: dựa vào Referer nếu có
  const referer = request.headers.get("referer");
  if (!referer) return true;
  try {
    return new URL(referer).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}
