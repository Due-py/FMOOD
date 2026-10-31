"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { presetById } from "@/lib/avatars";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fullNameSchema, nicknameSchema } from "@/lib/validation";

type Result = { ok: true } | { ok: false; error: string };

export async function completeOnboarding() {
  const profile = await requireProfile();
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", profile.id);
  redirect("/home");
}

function refresh() {
  revalidatePath("/", "layout");
}

/** Đổi biệt danh và họ tên. Ghi bằng quyền server để kiểm tra trùng biệt danh trong lớp. */
export async function updateProfileInfo(input: { nickname: string; fullName: string }): Promise<Result> {
  const profile = await requireProfile();
  const parsed = z.object({ nickname: nicknameSchema, fullName: fullNameSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Thông tin chưa hợp lệ." };
  const { nickname, fullName } = parsed.data;

  const admin = createAdminClient();
  if (nickname.toLowerCase() !== profile.nickname.toLowerCase() && profile.class_id) {
    const { data: taken } = await admin
      .from("profiles")
      .select("id")
      .eq("class_id", profile.class_id)
      .neq("id", profile.id)
      .ilike("nickname", nickname.replace(/[\\%_]/g, (c) => "\\" + c))
      .maybeSingle();
    if (taken) return { ok: false, error: "Biệt danh này đã có bạn trong lớp dùng rồi. Chọn tên khác nhé." };
  }

  const { error } = await admin.from("profiles").update({ nickname, full_name: fullName }).eq("id", profile.id);
  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "Biệt danh này vừa có bạn dùng mất rồi." : "Chưa lưu được. Thử lại nhé.",
    };
  }
  refresh();
  return { ok: true };
}

/** Chọn ảnh đại diện có sẵn (trợ lý / con vật). Xóa ảnh đã tải lên trước đó nếu có. */
export async function setPresetAvatar(presetId: string): Promise<Result> {
  const profile = await requireProfile();
  if (!presetById(presetId)) return { ok: false, error: "Ảnh không hợp lệ." };
  const admin = createAdminClient();
  if (profile.avatar?.startsWith("upload:")) await admin.storage.from("avatars").remove([profile.avatar.slice(7)]);
  const { error } = await admin
    .from("profiles")
    .update({ avatar: `preset:${presetId}`, avatar_updated_at: new Date().toISOString() })
    .eq("id", profile.id);
  if (error) return { ok: false, error: "Chưa lưu được. Thử lại nhé." };
  refresh();
  return { ok: true };
}

const MAX_BYTES = 400 * 1024;
const TYPES: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

/** Kiểm tra "chữ ký" đầu file để chắc là ảnh thật, không tin vào tên/kiểu file trình duyệt gửi. */
function sniffImage(bytes: Uint8Array): string | null {
  const hex = (n: number) => Array.from(bytes.slice(0, n), (b) => b.toString(16).padStart(2, "0")).join("");
  if (hex(3) === "ffd8ff") return "image/jpeg";
  if (hex(8) === "89504e470d0a1a0a") return "image/png";
  if (hex(4) === "52494646" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

/**
 * Tải ảnh đại diện lên. Trình duyệt đã cắt vuông và thu nhỏ còn 256×256 trước khi gửi.
 * Ảnh lưu ở bucket riêng tư; chỉ học sinh đó và thầy cô phụ trách xem được (qua đường dẫn có chữ ký).
 */
export async function uploadAvatar(formData: FormData): Promise<Result> {
  const profile = await requireProfile();
  const file = formData.get("file");
  if (!(file instanceof Blob) || file.size === 0) return { ok: false, error: "Chưa chọn ảnh." };
  if (file.size > MAX_BYTES) return { ok: false, error: "Ảnh quá lớn." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImage(bytes);
  if (!type) return { ok: false, error: "File này không phải ảnh JPG, PNG hoặc WebP." };

  const admin = createAdminClient();
  // tên file mới mỗi lần để trình duyệt không hiện ảnh cũ trong bộ nhớ đệm
  const path = `${profile.id}/${Date.now().toString(36)}.${TYPES[type]}`;
  const { error: upErr } = await admin.storage.from("avatars").upload(path, bytes, { contentType: type, upsert: false });
  if (upErr) return { ok: false, error: "Chưa tải ảnh lên được. Đã chạy migration 0006 chưa?" };

  if (profile.avatar?.startsWith("upload:")) await admin.storage.from("avatars").remove([profile.avatar.slice(7)]);
  const { error } = await admin
    .from("profiles")
    .update({ avatar: `upload:${path}`, avatar_updated_at: new Date().toISOString() })
    .eq("id", profile.id);
  if (error) return { ok: false, error: "Chưa lưu được. Thử lại nhé." };
  refresh();
  return { ok: true };
}
