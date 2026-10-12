import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { applyRemember, REMEMBER_COOKIE, wantsRemember } from "@/lib/remember";

// Các trang cần đăng nhập
const PROTECTED = ["/home", "/checkin", "/chat", "/habits", "/library", "/me", "/onboarding", "/garden", "/survey"];

/**
 * Chạy trước mỗi request: làm mới phiên đăng nhập Supabase (ghi lại cookie)
 * và đưa học sinh chưa đăng nhập về trang đầu.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // không tick "Nhớ tài khoản" thì giữ cookie phiên (hết khi đóng trình duyệt)
          const remember = wantsRemember(request.cookies.get(REMEMBER_COOKIE)?.value);
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, applyRemember(options, remember)),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;

  if (!signedIn && PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  // khu vực thầy cô: mọi trang trừ trang đăng nhập
  if (!signedIn && path.startsWith("/staff") && path !== "/staff/login") {
    return NextResponse.redirect(new URL("/staff/login", request.url));
  }
  // đã đăng nhập thì bỏ qua trang đăng nhập (trang đích tự chuyển theo vai trò)
  if (signedIn && path === "/") {
    return NextResponse.redirect(new URL("/home", request.url));
  }
  if (signedIn && path === "/staff/login") {
    return NextResponse.redirect(new URL("/staff", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // bỏ qua file tĩnh và ảnh
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
