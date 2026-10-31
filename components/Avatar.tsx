import { cn } from "@/components/ui/cn";
import { presetById, type AvatarView } from "@/lib/avatars";

/** Ảnh đại diện tròn: ảnh có sẵn (khuôn mặt cảm xúc / con vật) hoặc ảnh học sinh tự tải lên. */
export function Avatar({ avatar, size = 48, className }: { avatar: AvatarView; size?: number; className?: string }) {
  const box = cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full", className);

  if (avatar.kind === "image") {
    return (
      <span className={box} style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- đường dẫn có chữ ký, đổi mỗi giờ */}
        <img src={avatar.url} alt="Ảnh đại diện" width={size} height={size} className="size-full object-cover" />
      </span>
    );
  }

  const preset = presetById(avatar.id) ?? presetById("may-happy")!;
  return (
    <span className={cn(box, preset.bg)} style={{ width: size, height: size }} role="img" aria-label={preset.label}>
      <span aria-hidden style={{ fontSize: size * 0.55, lineHeight: 1 }}>
        {preset.emoji}
      </span>
    </span>
  );
}
