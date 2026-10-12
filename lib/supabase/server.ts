import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabasePublishableKey, supabaseUrl } from "@/lib/env";
import { applyRemember, REMEMBER_COOKIE, wantsRemember } from "@/lib/remember";

/** Client Supabase đóng vai học sinh đang đăng nhập (tuân theo RLS). */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        const remember = wantsRemember(cookieStore.get(REMEMBER_COOKIE)?.value);
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, applyRemember(options, remember)),
          );
        } catch {
          // Gọi từ Server Component thì không ghi cookie được; proxy.ts sẽ làm mới phiên.
        }
      },
    },
  });
}
