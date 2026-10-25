"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff, type Profile } from "@/lib/auth";
import { audit } from "@/lib/settings";
import { KIND_ORDER, parseItemData, type ContentKind, type ContentStatus } from "@/lib/support-content";
import { createAdminClient } from "@/lib/supabase/admin";

// DUYỆT NỘI DUNG VÒNG HỖ TRỢ (cô Thúy: admin hoặc phòng tham vấn).
// Mỗi hàm tự kiểm tra vai trò, ghi người duyệt và nhật ký thao tác.

type Result = { ok: true } | { ok: false; error: string };
const FAILED = { ok: false as const, error: "Chưa lưu được. Thử lại nhé." };
const READ_ONLY = { ok: false as const, error: "Bản nháp câu trả lời khẩn cấp chỉ để đọc. Sửa câu đang dùng ở trang Khẩn cấp." };
const PATH = "/staff/content/vong-ho-tro";

const statusSchema = z.enum(["off", "test", "on"]);
const STATUS_LABEL: Record<ContentStatus, string> = { off: "Tắt", test: "Chỉ lớp thử", on: "Bật cho mọi lớp" };

async function reviewer(): Promise<Profile> {
  return requireStaff(["admin", "counselor"]);
}

const reviewed = (p: Profile) => ({
  reviewed_by: p.id,
  reviewed_by_name: p.full_name ?? p.nickname,
  reviewed_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

async function findItem(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const { data } = await createAdminClient().from("support_content").select("id, key, kind").eq("id", id).maybeSingle();
  return data as { id: string; key: string; kind: ContentKind } | null;
}

/** Đổi trạng thái một mục: Tắt / Chỉ lớp thử / Bật cho mọi lớp. */
export async function setContentStatus(id: string, status: ContentStatus): Promise<Result> {
  const profile = await reviewer();
  const parsed = statusSchema.safeParse(status);
  const item = await findItem(id);
  if (!parsed.success || !item) return { ok: false, error: "Không tìm thấy mục này." };
  if (item.kind === "crisis_draft") return READ_ONLY;

  const { error } = await createAdminClient()
    .from("support_content")
    .update({ status: parsed.data, ...reviewed(profile) })
    .eq("id", id);
  if (error) return FAILED;
  await audit(profile, "Vòng hỗ trợ: đổi trạng thái", `${item.key} → ${STATUS_LABEL[parsed.data]}`);
  revalidatePath(PATH);
  return { ok: true };
}

/** Đổi trạng thái cả nhóm (một loại, có thể trong một chủ đề). */
export async function setGroupStatus(kind: ContentKind, topic: string | null, status: ContentStatus): Promise<Result> {
  const profile = await reviewer();
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success || !KIND_ORDER.includes(kind)) return { ok: false, error: "Nhóm không hợp lệ." };
  if (kind === "crisis_draft") return READ_ONLY;

  let query = createAdminClient().from("support_content").update({ status: parsed.data, ...reviewed(profile) }).eq("kind", kind);
  // mỗi chủ đề có chủ đề của chính nó, nên "đặt cả nhóm" cho loại chủ đề là đặt tất cả chủ đề
  if (kind !== "topic") query = topic === null ? query.is("topic", null) : query.eq("topic", topic);
  const { error } = await query;
  if (error) return FAILED;
  await audit(profile, "Vòng hỗ trợ: đổi trạng thái cả nhóm", `${kind}${topic ? ` · ${topic}` : ""} → ${STATUS_LABEL[parsed.data]}`);
  revalidatePath(PATH);
  return { ok: true };
}

/** Sửa nội dung một mục (kiểm tra đúng cấu trúc của loại đó). */
export async function saveContentData(id: string, data: unknown): Promise<Result> {
  const profile = await reviewer();
  const item = await findItem(id);
  if (!item) return { ok: false, error: "Không tìm thấy mục này." };
  if (item.kind === "crisis_draft") return READ_ONLY;
  const parsed = parseItemData(item.kind, data);
  if (!parsed.ok) return parsed;

  const { error } = await createAdminClient()
    .from("support_content")
    .update({ data: parsed.data, ...reviewed(profile) })
    .eq("id", id);
  if (error) return FAILED;
  await audit(profile, "Vòng hỗ trợ: sửa nội dung", item.key);
  revalidatePath(PATH);
  return { ok: true };
}
