import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseSecretKey, supabaseUrl } from "@/lib/env";

/**
 * Client quyền quản trị (bỏ qua RLS). CHỈ dùng phía server cho các việc
 * học sinh không được tự làm: tạo tài khoản, ghi tin nhắn, ghi cảnh báo.
 */
export function createAdminClient() {
  return createClient(supabaseUrl(), supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
