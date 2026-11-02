"use client";

import { useRef, useState, useTransition } from "react";
import { setPresetAvatar, updateProfileInfo, uploadAvatar } from "@/app/actions/profile";
import { Avatar } from "@/components/Avatar";
import { btn, input } from "@/components/ui/styles";
import { btnWhite } from "../MeBox";
import { cn } from "@/components/ui/cn";
import { PRESET_AVATARS, type AvatarView } from "@/lib/avatars";
import { readSavedLogin, writeSavedLogin } from "@/lib/remember";

type Tab = "mood" | "emoji" | "upload";

/** hộp trắng bo 28px bóng mềm (giao diện vui, mẫu toi.html thẻ Hồ sơ) */
const box = "rounded-[1.75rem] bg-surface p-4 shadow-soft sm:p-5 dark:border dark:border-line";

const TABS: { value: Tab; label: string }[] = [
  { value: "mood", label: "😊 Cảm xúc" },
  { value: "emoji", label: "🐾 Con vật" },
  { value: "upload", label: "📷 Ảnh của bạn" },
];

/** Cắt vuông ở giữa và thu nhỏ còn 256×256, xuất WebP (làm ngay trên máy, không gửi ảnh gốc). */
async function squareThumbnail(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 256, 256);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Không xử lý được ảnh"))), "image/webp", 0.85),
  );
}

export function ProfileEditor({
  avatar,
  currentAvatar,
  nickname,
  fullName,
}: {
  avatar: AvatarView;
  currentAvatar: string | null;
  nickname: string;
  fullName: string;
}) {
  const [preview, setPreview] = useState<AvatarView>(avatar);
  const [tab, setTab] = useState<Tab>(currentAvatar?.startsWith("upload:") ? "upload" : currentAvatar?.includes("may") || !currentAvatar ? "mood" : "emoji");
  const [avatarMsg, setAvatarMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingAvatar, startAvatar] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const [nick, setNick] = useState(nickname);
  const [name, setName] = useState(fullName);
  const [infoMsg, setInfoMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingInfo, startInfo] = useTransition();

  const selectedPreset = preview.kind === "preset" ? preview.id : null;

  function choosePreset(id: string) {
    setPreview({ kind: "preset", id });
    setAvatarMsg(null);
    startAvatar(async () => {
      const res = await setPresetAvatar(id);
      setAvatarMsg(res.ok ? { ok: true, text: "Đã đổi ảnh đại diện." } : { ok: false, text: res.error });
    });
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setAvatarMsg({ ok: false, text: "Hãy chọn một file ảnh." });
    if (file.size > 15 * 1024 * 1024) return setAvatarMsg({ ok: false, text: "Ảnh quá lớn (tối đa 15MB)." });
    setAvatarMsg(null);
    startAvatar(async () => {
      try {
        const thumb = await squareThumbnail(file);
        setPreview({ kind: "image", url: URL.createObjectURL(thumb) });
        const fd = new FormData();
        fd.append("file", thumb, "avatar.webp");
        const res = await uploadAvatar(fd);
        setAvatarMsg(res.ok ? { ok: true, text: "Đã cập nhật ảnh của bạn." } : { ok: false, text: res.error });
      } catch {
        setAvatarMsg({ ok: false, text: "Không đọc được ảnh này. Thử ảnh khác nhé." });
      }
    });
  }

  const presets = PRESET_AVATARS.filter((p) => (tab === "mood" ? p.kind === "mood" : p.kind === "emoji"));

  return (
    <div className="fm-stagger space-y-5">
      {/* ───────── Ảnh đại diện ───────── */}
      <section className={box}>
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative">
            <Avatar avatar={preview} size={96} className="shadow-soft ring-[5px] ring-c1" />
            {savingAvatar && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-surface/70 text-xs font-semibold">Đang lưu…</span>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-[1.35rem] font-extrabold leading-tight tracking-tight">Ảnh đại diện</h2>
            <p className="text-sm text-muted">Chọn một khuôn mặt cảm xúc, một con vật, hoặc ảnh của chính bạn.</p>
            {avatarMsg && (
              <p role={avatarMsg.ok ? "status" : "alert"} className={cn("mt-1 text-sm", avatarMsg.ok ? "text-brand-strong dark:text-brand" : "text-danger")}>
                {avatarMsg.text}
              </p>
            )}
          </div>
        </div>

        <div role="tablist" aria-label="Loại ảnh đại diện" className="mt-5 flex gap-1 rounded-full bg-surface-2 p-1 sm:inline-flex">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => setTab(t.value)}
              className={cn("min-h-11 flex-1 whitespace-nowrap rounded-full px-3 py-2 text-[13px] font-bold transition sm:flex-none sm:px-4 sm:text-sm", tab === t.value ? "bg-surface text-ink shadow-[0_2px_6px_rgb(61_52_80/0.1)]" : "text-muted hover:text-ink")}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab !== "upload" ? (
          <div role="radiogroup" aria-label="Ảnh có sẵn" className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={selectedPreset === p.id}
                aria-label={p.label}
                title={p.label}
                disabled={savingAvatar}
                onClick={() => choosePreset(p.id)}
                className={cn(
                  "mx-auto flex size-[72px] items-center justify-center rounded-full p-1 transition duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:transform-none",
                  selectedPreset === p.id ? "ring-[3px] ring-brand-edge" : "ring-1 ring-transparent hover:ring-line",
                )}
              >
                <Avatar avatar={{ kind: "preset", id: p.id }} size={64} />
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-[1.25rem] border-2 border-dashed border-line p-6 text-center">
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} aria-label="Chọn ảnh" />
            <p className="text-3xl" aria-hidden>
              📷
            </p>
            <button type="button" disabled={savingAvatar} onClick={() => fileRef.current?.click()} className={cn(btnWhite, "mt-3")}>
              Chọn ảnh từ máy
            </button>
            <p className="mx-auto mt-3 max-w-sm text-xs leading-relaxed text-muted">
              Ảnh được cắt vuông và thu nhỏ ngay trên máy bạn trước khi tải lên. Chỉ bạn và thầy cô phụ trách thấy được
              ảnh này, các bạn khác thì không. Đừng dùng ảnh có thông tin riêng tư (đồng phục ghi tên, giấy tờ…).
            </p>
          </div>
        )}
      </section>

      {/* ───────── Thông tin ───────── */}
      <form
        action={() =>
          startInfo(async () => {
            setInfoMsg(null);
            const res = await updateProfileInfo({ nickname: nick, fullName: name });
            setInfoMsg(res.ok ? { ok: true, text: "Đã lưu thông tin." } : { ok: false, text: res.error });
            // máy này đang nhớ tài khoản thì điền sẵn biệt danh mới cho lần đăng nhập sau
            const saved = readSavedLogin();
            if (res.ok && saved?.nickname) writeSavedLogin({ ...saved, nickname: nick.trim().replace(/s+/g, " ") });
          })
        }
        className={cn(box, "space-y-4")}
      >
        <h2 className="font-display text-[1.35rem] font-extrabold leading-tight tracking-tight">Thông tin</h2>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Biệt danh</span>
          <input value={nick} onChange={(e) => setNick(e.target.value)} required maxLength={24} autoComplete="username" className={input} />
          <span className="mt-1 block text-xs text-muted">
            Trợ lý trò chuyện gọi bạn bằng tên này. Bạn đăng nhập bằng <strong>biệt danh mới</strong> từ lần sau. Không được trùng với bạn
            khác trong lớp.
          </span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Họ và tên</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} autoComplete="name" className={input} />
          <span className="mt-1 block text-xs text-muted">🔒 Chỉ thầy cô chủ nhiệm và phòng tham vấn thấy, để giúp bạn kịp thời khi cần.</span>
        </label>
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <button type="submit" disabled={savingInfo || (nick.trim() === nickname && name.trim() === fullName)} className={btn.primary}>
            {savingInfo ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
          {infoMsg && (
            <p role={infoMsg.ok ? "status" : "alert"} className={cn("text-sm", infoMsg.ok ? "text-brand-strong dark:text-brand" : "text-danger")}>
              {infoMsg.text}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
