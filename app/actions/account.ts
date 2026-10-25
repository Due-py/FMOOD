"use server";

import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { removeAvatarFiles } from "@/lib/avatar-server";
import { audit } from "@/lib/settings";
import { passwordSchema } from "@/lib/validation";

type Result = { ok: true } | { ok: false; error: string };

export async function changePassword(input: { password: string; confirm: string }): Promise<Result> {
  await requireProfile();
  const parsed = passwordSchema.safeParse(input.password);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (input.password !== input.confirm) return { ok: false, error: "Hai mật khẩu chưa giống nhau." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    return {
      ok: false,
      error:
        error.code === "same_password"
          ? "Mật khẩu mới cần khác mật khẩu cũ."
          : "Chưa đổi được mật khẩu. Thử lại nhé.",
    };
  }
  return { ok: true };
}

/**
 * Xóa tài khoản và toàn bộ dữ liệu (check-in, trò chuyện, thói quen).
 * Cảnh báo an toàn đã gửi thầy cô được giữ lại, không còn gắn với tài khoản.
 */
export async function deleteMyAccount(confirmText: string): Promise<Result> {
  const profile = await requireProfile();
  if (confirmText.trim().toUpperCase() !== "XOA") {
    return { ok: false, error: "Gõ đúng chữ XOA để xác nhận." };
  }

  const admin = createAdminClient();
  await removeAvatarFiles(profile.id);
  const { error } = await admin.auth.admin.deleteUser(profile.id);
  if (error) {
    console.error("deleteUser failed", error);
    return { ok: false, error: "Chưa xóa được. Thử lại sau nhé." };
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/**
 * Đặt mật khẩu mới sau khi thầy cô đặt mật khẩu tạm. Xong thì gỡ cờ "phải đổi mật khẩu"
 * (cờ chỉ máy chủ gỡ được) và ghi nhật ký để admin đối chiếu với lần đặt mật khẩu tạm.
 */
export async function setPasswordAfterReset(input: { password: string; confirm: string }): Promise<Result> {
  const profile = await requireProfile({ allowPasswordChange: true });
  if (!profile.must_change_password) redirect("/home");
  const parsed = passwordSchema.safeParse(input.password);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (input.password !== input.confirm) return { ok: false, error: "Hai mật khẩu chưa giống nhau." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    return {
      ok: false,
      error: error.code === "same_password" ? "Hãy chọn mật khẩu khác mật khẩu tạm." : "Chưa đổi được mật khẩu. Thử lại nhé.",
    };
  }
  const { error: flagError } = await createAdminClient().auth.admin.updateUserById(profile.id, {
    app_metadata: { must_change_password: false },
  });
  if (flagError) return { ok: false, error: "Chưa lưu được. Thử lại nhé." };
  await audit(profile, "Học sinh đặt mật khẩu mới sau khi được đặt mật khẩu tạm", profile.id);
  redirect("/home");
}
