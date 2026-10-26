import "server-only";
import type { Profile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { demoRegistry } from "./server";
import { isDemoEmail } from "./shared";

// Hồ sơ của một tài khoản MẪU, để chạy đúng code của app "như thể" bạn ấy / thầy cô ấy đang dùng
// (xem trước trang chủ, trả lời Mây hỏi thăm, xem trang GVCN). Tài khoản thật luôn bị từ chối.

const COLS = "id, nickname, full_name, email, class_id, role, onboarded_at, locked_at, avatar";

export async function demoProfile(id: string): Promise<Profile | null> {
  const registry = await demoRegistry();
  if (!registry || ![...registry.studentIds, ...registry.staffIds].includes(id)) return null;
  const db = createAdminClient();
  const [{ data }, { data: auth }] = await Promise.all([db.from("profiles").select(COLS).eq("id", id).maybeSingle(), db.auth.admin.getUserById(id)]);
  if (!data || !isDemoEmail(auth?.user?.email)) return null;
  return { ...(data as Omit<Profile, "must_change_password">), must_change_password: false };
}

export type DemoPerson = { id: string; nickname: string; className: string | null; classId: string | null };

/** Học sinh mẫu (để chọn bạn xem hành trình), theo lớp rồi biệt danh. */
export async function demoStudents(): Promise<DemoPerson[]> {
  const registry = await demoRegistry();
  if (!registry?.studentIds.length) return [];
  const { data } = await createAdminClient()
    .from("profiles")
    .select("id, nickname, class_id, classes!profiles_class_id_fkey(name)")
    .in("id", registry.studentIds)
    .order("nickname");
  return (data ?? [])
    .map((p) => ({
      id: p.id as string,
      nickname: p.nickname as string,
      classId: p.class_id as string | null,
      className: (p.classes as unknown as { name: string } | null)?.name ?? null,
    }))
    .sort((a, b) => (a.className ?? "").localeCompare(b.className ?? "") || a.nickname.localeCompare(b.nickname, "vi"));
}
