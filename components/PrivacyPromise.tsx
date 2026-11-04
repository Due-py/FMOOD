"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MascotArt } from "@/components/mascot/MascotArt";
import { cn } from "@/components/ui/cn";

// BẢNG CAM KẾT RIÊNG TƯ khi học sinh vừa đăng nhập (Duy duyệt mẫu 04/11, bản 2).
// Form đăng nhập gọi markPrivacyPromise() trước khi chuyển trang; trang học sinh đầu tiên (Hôm nay hoặc Làm quen) thấy dấu này
// thì mở bảng một lần, bấm nút (hoặc Esc) là đóng và xóa dấu. Dấu ở sessionStorage: chỉ trong tab đó, chỉ ngay sau đăng nhập.
// Mọi câu phải đúng với app (xem trang Quyền riêng tư): F-Mood CÓ lưu lời học sinh để chính các em xem lại, CÓ tính số liệu chung
// (thầy cô chỉ thấy con số, không biết là ai), AI đọc tin nhắn để trả lời, và có ngoại lệ khi có dấu hiệu nguy hiểm.

const KEY = "fmood-cam-ket";

/** Gọi ngay sau khi học sinh đăng nhập / tạo tài khoản thành công. */
export function markPrivacyPromise() {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    // trình duyệt chặn lưu tạm: bỏ qua, không hiện bảng
  }
}

const PROMISES: { text: React.ReactNode; exception?: boolean }[] = [
  {
    text: (
      <>
        <b>Thầy cô, bạn bè và nhóm làm F-Mood không đọc được</b> lời bạn trò chuyện, nhật ký, tâm trạng hay bài luyện của bạn.
      </>
    ),
  },
  {
    text: (
      <>
        F-Mood có tính số liệu chung về cách cả lớp dùng app, nhưng thầy cô <b>chỉ thấy con số, không biết là bạn nào</b>. Nhóm dưới 5
        bạn thì ẩn số.
      </>
    ),
  },
  {
    text: (
      <>
        Những gì bạn viết được cất giữ để <b>chính bạn xem lại</b>. Bạn xóa được bất cứ lúc nào.
      </>
    ),
  },
  {
    exception: true,
    text: (
      <>
        <b>Chỉ một ngoại lệ:</b> khi có dấu hiệu bạn đang gặp nguy hiểm, thầy cô phụ trách được báo và chỉ đọc đúng đoạn đáng lo, để
        kịp giúp bạn.
      </>
    ),
  },
];

export function PrivacyPromise() {
  const ref = useRef<HTMLDialogElement>(null);
  const okRef = useRef<HTMLButtonElement>(null);
  const [due, setDue] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage chỉ đọc được sau khi trang đã hiện
      if (sessionStorage.getItem(KEY) === "1") setDue(true);
    } catch {
      // không đọc được: không hiện
    }
  }, []);

  useEffect(() => {
    if (!due || !ref.current || ref.current.open) return;
    ref.current.showModal();
    // showModal tự chọn ô đầu tiên (đường link); chọn sẵn nút đóng để bấm Enter là xong
    okRef.current?.focus();
  }, [due]);

  if (!due) return null;

  const close = () => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      // bỏ qua
    }
    ref.current?.close();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby="cam-ket-tieu-de"
      onClose={close}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[30rem] overflow-y-auto rounded-[1.6rem] bg-surface p-4 text-ink shadow-soft backdrop:bg-black/50 sm:p-5 dark:border dark:border-line"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-c1">
          <MascotArt size={46} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-c1-ink">Trước khi bắt đầu</p>
          <h2 id="cam-ket-tieu-de" className="font-display text-[22px] font-extrabold leading-tight">
            Chuyện của bạn là của riêng bạn 🔒
          </h2>
        </div>
      </div>
      <ul className="mt-3.5 grid gap-2 text-[15px] leading-snug">
        {PROMISES.map((p, i) => (
          <li key={i} className={cn(p.exception ? "tone-4" : "tone-2", "flex gap-2.5 rounded-2xl bg-tint px-3 py-2.5")}>
            <span aria-hidden className="mt-px grid size-[22px] shrink-0 place-items-center rounded-full bg-tink text-xs font-extrabold text-surface">
              {p.exception ? "!" : "✓"}
            </span>
            <span>{p.text}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 text-xs text-muted">
        Trợ lý AI cần đọc tin nhắn để trả lời bạn, nhưng không biết họ tên thật của bạn.{" "}
        <Link href="/quyen-rieng-tu" onClick={close} className="font-bold text-ink underline underline-offset-2">
          Đọc thêm về quyền riêng tư
        </Link>
      </p>
      <button
        ref={okRef}
        type="button"
        onClick={close}
        className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full border-2 border-brand-edge bg-brand font-display text-lg font-extrabold text-brand-ink shadow-[0_3px_0_var(--brand-edge)] transition active:translate-y-0.5 active:shadow-[0_1px_0_var(--brand-edge)]"
      >
        Mình yên tâm rồi
      </button>
    </dialog>
  );
}
