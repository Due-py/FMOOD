import { createBrowserClient } from "@supabase/ssr";

/** Client Supabase trong trình duyệt (chỉ dùng để đăng nhập). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
