"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { isChatLength } from "@/lib/chat-events";
import { FOLLOW_UP_DAYS } from "@/lib/may-memory-shared";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Học sinh tự quản lý những điều Mây nhớ và danh sách điều bận lòng.
// Sửa / xóa đi qua quyền của chính học sinh (RLS), nên chỉ đụng được dữ liệu của mình.

type Result = { ok: true } | { ok: false; error: string };

const FAILED: Result = { ok: false, error: "Chưa lưu được. Thử lại nhé." };
const idSchema = z.uuid();

/** Độ dài câu trả lời của Mây (ngắn / vừa / chi tiết). */
export async function setChatLength(length: string): Promise<Result> {
  const profile = await requireProfile();
  if (!isChatLength(length)) return FAILED;
  const { error } = await createAdminClient().from("profiles").update({ chat_length: length }).eq("id", profile.id);
  return error ? FAILED : { ok: true };
}

export async function updateMemory(id: string, content: string): Promise<Result> {
  await requireProfile();
  const text = z.string().trim().min(1, "Nội dung trống").max(200, "Tối đa 200 ký tự").safeParse(content);
  if (!idSchema.safeParse(id).success) return FAILED;
  if (!text.success) return { ok: false, error: text.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_memories")
    .update({ content: text.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return FAILED;
  revalidatePath("/me/ghi-nho");
  return { ok: true };
}

export async function deleteMemory(id: string): Promise<Result> {
  await requireProfile();
  if (!idSchema.safeParse(id).success) return FAILED;
  const supabase = await createClient();
  const { error } = await supabase.from("student_memories").delete().eq("id", id);
  if (error) return FAILED;
  // không revalidate trang chat (đang mở sẽ bị dựng lại); trang ghi nhớ luôn đọc mới
  return { ok: true };
}

export async function deleteAllMemories(): Promise<Result> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("student_memories").delete().eq("user_id", profile.id);
  if (error) return FAILED;
  revalidatePath("/me/ghi-nho");
  return { ok: true };
}

const concernPatch = z.object({
  intensity: z.number().int().min(1).max(10).optional(),
  status: z.enum(["open", "better", "resolved"]).optional(),
});

export async function updateConcern(id: string, patch: { intensity?: number; status?: string }): Promise<Result> {
  await requireProfile();
  const p = concernPatch.safeParse(patch);
  if (!idSchema.safeParse(id).success || !p.success) return FAILED;
  const update: Record<string, unknown> = { ...p.data, updated_at: new Date().toISOString() };
  if (p.data.status === "resolved") update.next_check_at = null;
  else if (p.data.status) update.next_check_at = new Date(Date.now() + FOLLOW_UP_DAYS * 86_400_000).toISOString();
  const supabase = await createClient();
  const { data, error } = await supabase.from("student_concerns").update(update).eq("id", id).select("id");
  if (error || !data?.length) return FAILED;
  revalidatePath("/me/ghi-nho");
  revalidatePath("/home");
  return { ok: true };
}

export async function deleteConcern(id: string): Promise<Result> {
  await requireProfile();
  if (!idSchema.safeParse(id).success) return FAILED;
  const supabase = await createClient();
  const { error } = await supabase.from("student_concerns").delete().eq("id", id);
  if (error) return FAILED;
  revalidatePath("/me/ghi-nho");
  revalidatePath("/home");
  return { ok: true };
}
