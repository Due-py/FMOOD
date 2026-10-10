import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Đăng xuất rồi chuyển trang. Dùng khi phiên còn cookie nhưng tài khoản
 * không còn hợp lệ (bị khóa, bị xóa), để không bị chuyển trang qua lại mãi.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const to = request.nextUrl.searchParams.get("to");
  const target = to === "/staff/login" ? "/staff/login" : "/";
  return NextResponse.redirect(new URL(target, request.url));
}
