import "server-only";
import { DEFAULT_AVATAR, presetById, type AvatarView } from "@/lib/avatars";
import { createAdminClient } from "@/lib/supabase/admin";

const SIGNED_SECONDS = 60 * 60;

function presetView(avatar: string | null): AvatarView {
  const id = (avatar ?? DEFAULT_AVATAR).replace(/^preset:/, "");
  return { kind: "preset", id: presetById(id) ? id : DEFAULT_AVATAR.slice(7) };
}

/** Chuẩn bị ảnh đại diện để hiển thị. Ảnh tải lên nằm ở bucket riêng tư nên cần đường dẫn có chữ ký (1 giờ). */
export async function resolveAvatar(avatar: string | null): Promise<AvatarView> {
  if (!avatar?.startsWith("upload:")) return presetView(avatar);
  const { data } = await createAdminClient().storage.from("avatars").createSignedUrl(avatar.slice(7), SIGNED_SECONDS);
  return data?.signedUrl ? { kind: "image", url: data.signedUrl } : presetView(null);
}

/** Như trên nhưng cho cả danh sách (một lần gọi Storage). */
export async function resolveAvatars(avatars: (string | null)[]): Promise<AvatarView[]> {
  const paths = avatars.filter((a): a is string => !!a?.startsWith("upload:")).map((a) => a.slice(7));
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data } = await createAdminClient().storage.from("avatars").createSignedUrls(paths, SIGNED_SECONDS);
    for (const d of data ?? []) if (d.path && d.signedUrl) signed.set(d.path, d.signedUrl);
  }
  return avatars.map((a) => {
    if (a?.startsWith("upload:")) {
      const url = signed.get(a.slice(7));
      return url ? { kind: "image" as const, url } : presetView(null);
    }
    return presetView(a);
  });
}

/** Xóa mọi ảnh đại diện đã tải lên của một người (khi xóa tài khoản). */
export async function removeAvatarFiles(userId: string) {
  const bucket = createAdminClient().storage.from("avatars");
  const { data } = await bucket.list(userId);
  if (data?.length) await bucket.remove(data.map((f) => `${userId}/${f.name}`));
}
