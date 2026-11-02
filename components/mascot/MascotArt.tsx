"use client";

import type { CharacterKey } from "@/lib/ai/chat-style";
import { useAssistant } from "./AssistantContext";

// HÌNH NHÂN VẬT VẼ BẰNG SVG (mẫu giao diện vui, Duy duyệt 02/11): cả người, mặt cười, má hồng, một tay vẫy.
// Ba nhân vật cùng một khung 100×120 để thay nhau được: Kiến tím (mẫu gốc), Sóc cam có đuôi to, Cú nâu có chỏm tai.
// Ô tròn có emoji (CharacterAvatar) vẫn dùng cho chỗ nhỏ như cạnh tin nhắn.

type Props = {
  /** chiều rộng, px (chiều cao = 1,2 lần) */
  size?: number;
  /** nhân vật cụ thể; bỏ trống thì dùng nhân vật của người đang xem */
  character?: CharacterKey;
  className?: string;
  /** khẽ nhún lên xuống (tắt khi người dùng chọn giảm chuyển động) */
  float?: boolean;
};

function Face({ cx = 50, cy = 42 }: { cx?: number; cy?: number }) {
  return (
    <g>
      <ellipse cx={cx - 9} cy={cy - 2} rx={7} ry={8} fill="#fff" />
      <ellipse cx={cx + 9} cy={cy - 2} rx={7} ry={8} fill="#fff" />
      <circle cx={cx - 8} cy={cy} r={4} fill="#2b2240" />
      <circle cx={cx + 10} cy={cy} r={4} fill="#2b2240" />
      <circle cx={cx - 6.5} cy={cy - 2} r={1.4} fill="#fff" />
      <circle cx={cx + 11.5} cy={cy - 2} r={1.4} fill="#fff" />
      <circle cx={cx - 17} cy={cy + 8} r={4} fill="#f4a3b4" opacity={0.8} />
      <circle cx={cx + 17} cy={cy + 8} r={4} fill="#f4a3b4" opacity={0.8} />
      <path d={`M${cx - 7} ${cy + 11} q7 7 14 0`} stroke="#2b2240" strokeWidth={2.5} fill="#fff" strokeLinecap="round" />
    </g>
  );
}

function Kien() {
  return (
    <g>
      <path d="M44 22 C40 10 32 6 26 8" stroke="#5a469c" strokeWidth={3} fill="none" strokeLinecap="round" />
      <path d="M56 22 C60 10 68 6 74 8" stroke="#5a469c" strokeWidth={3} fill="none" strokeLinecap="round" />
      <circle cx={25} cy={8} r={5} fill="#8f78dd" />
      <circle cx={75} cy={8} r={5} fill="#8f78dd" />
      <ellipse cx={50} cy={94} rx={15} ry={13} fill="#7c64cf" />
      <ellipse cx={50} cy={74} rx={11} ry={10} fill="#8f78dd" />
      <path d="M40 72 C30 66 26 58 30 52" stroke="#5a469c" strokeWidth={4} fill="none" strokeLinecap="round" />
      <path d="M60 72 C72 70 78 60 80 50" stroke="#5a469c" strokeWidth={4} fill="none" strokeLinecap="round" />
      <circle cx={80} cy={47} r={5} fill="#8f78dd" />
      <path d="M44 104 l-6 10 M56 104 l6 10" stroke="#5a469c" strokeWidth={4} strokeLinecap="round" />
      <circle cx={50} cy={42} r={24} fill="#8f78dd" />
      <Face />
    </g>
  );
}

function Soc() {
  return (
    <g>
      {/* đuôi to cong sau lưng */}
      <path d="M62 108 C92 104 96 70 82 56 C74 48 66 58 72 66 C80 76 74 92 60 96 Z" fill="#e8955a" stroke="#c46f35" strokeWidth={2} />
      <path d="M30 26 L26 10 L40 20 Z M70 26 L74 10 L60 20 Z" fill="#e8955a" stroke="#c46f35" strokeWidth={2} strokeLinejoin="round" />
      <ellipse cx={50} cy={92} rx={17} ry={16} fill="#e8955a" />
      <ellipse cx={50} cy={95} rx={10} ry={11} fill="#fbe3cc" />
      <path d="M38 80 C28 74 26 64 30 56" stroke="#c46f35" strokeWidth={4.5} fill="none" strokeLinecap="round" />
      <circle cx={30} cy={53} r={5} fill="#e8955a" />
      <path d="M44 106 l-4 9 M56 106 l4 9" stroke="#c46f35" strokeWidth={4.5} strokeLinecap="round" />
      <circle cx={50} cy={44} r={26} fill="#e8955a" />
      <ellipse cx={50} cy={52} rx={15} ry={11} fill="#fbe3cc" />
      <Face cy={44} />
    </g>
  );
}

function Cu() {
  return (
    <g>
      <path d="M28 30 L22 12 L40 22 Z M72 30 L78 12 L60 22 Z" fill="#9c7b5b" stroke="#6f5338" strokeWidth={2} strokeLinejoin="round" />
      <ellipse cx={50} cy={84} rx={24} ry={27} fill="#9c7b5b" />
      <ellipse cx={50} cy={88} rx={15} ry={18} fill="#f1e2c8" />
      <path d="M44 84 q3 3 6 0 q3 3 6 0 M44 92 q3 3 6 0 q3 3 6 0" stroke="#c9ad85" strokeWidth={1.6} fill="none" />
      {/* cánh trái khép, cánh phải vẫy */}
      <path d="M27 72 C20 84 22 98 30 104 C32 92 32 82 27 72 Z" fill="#7f6146" />
      <path d="M73 70 C84 64 90 54 88 44 C80 50 74 60 73 70 Z" fill="#7f6146" />
      <path d="M43 110 l-3 7 M57 110 l3 7" stroke="#e0a43c" strokeWidth={4} strokeLinecap="round" />
      <circle cx={50} cy={44} r={26} fill="#9c7b5b" />
      <circle cx={41} cy={42} r={11} fill="#f1e2c8" />
      <circle cx={59} cy={42} r={11} fill="#f1e2c8" />
      <path d="M46 52 L50 58 L54 52 Z" fill="#e0a43c" />
      <circle cx={42} cy={42} r={4.5} fill="#2b2240" />
      <circle cx={58} cy={42} r={4.5} fill="#2b2240" />
      <circle cx={43.5} cy={40} r={1.5} fill="#fff" />
      <circle cx={59.5} cy={40} r={1.5} fill="#fff" />
      <circle cx={30} cy={53} r={3.5} fill="#f4a3b4" opacity={0.8} />
      <circle cx={70} cy={53} r={3.5} fill="#f4a3b4" opacity={0.8} />
    </g>
  );
}

const ART: Record<CharacterKey, () => React.JSX.Element> = { kien: Kien, soc: Soc, cu: Cu };

export function MascotArt({ size = 110, character, className = "", float = false }: Props) {
  const mine = useAssistant();
  const key = character ?? mine.key;
  const Art = ART[key] ?? Kien;
  return (
    <svg
      viewBox="0 0 100 120"
      width={size}
      height={size * 1.2}
      role="img"
      aria-label={`${mine.key === key ? mine.name : key} vẫy tay`}
      className={`${float ? "may-float" : ""} shrink-0 ${className}`}
    >
      <Art />
    </svg>
  );
}
