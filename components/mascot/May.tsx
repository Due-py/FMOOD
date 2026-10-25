import type { MascotMood } from "@/lib/mascot";

type Props = {
  mood?: MascotMood;
  size?: number;
  float?: boolean;
  className?: string;
};

const INK = "#2b2a33";

/** Mây: linh vật đám mây của F-Mood, vẽ bằng SVG, biểu cảm đổi theo tâm trạng. */
export function May({ mood = "happy", size = 120, float = true, className = "" }: Props) {
  return (
    <svg
      viewBox="0 0 124 104"
      width={size}
      height={(size * 104) / 124}
      role="img"
      aria-label={`Mây (${MOOD_LABEL[mood]})`}
      className={`${float ? "may-float" : ""} shrink-0 overflow-visible ${className}`}
    >
      {/* bóng dưới chân */}
      <ellipse cx="62" cy="98" rx="34" ry="4" fill="currentColor" opacity="0.08" />

      {/* thân mây */}
      <g
        className="fill-white dark:fill-[#e6f5ec]"
        style={{ filter: "drop-shadow(0 4px 8px rgba(40, 30, 10, 0.10))" }}
      >
        <circle cx="38" cy="60" r="24" />
        <circle cx="62" cy="42" r="29" />
        <circle cx="89" cy="57" r="23" />
        <rect x="24" y="52" width="80" height="36" rx="18" />
      </g>

      {/* má hồng */}
      <ellipse cx="41" cy="70" rx="6" ry="3.6" fill="#ff9fb2" opacity="0.55" />
      <ellipse cx="83" cy="70" rx="6" ry="3.6" fill="#ff9fb2" opacity="0.55" />

      <Face mood={mood} />
    </svg>
  );
}

const MOOD_LABEL: Record<MascotMood, string> = {
  happy: "vui vẻ",
  calm: "bình yên",
  sad: "đồng cảm",
  worried: "lo lắng",
  sleepy: "buồn ngủ",
  cheer: "reo vui",
  caring: "quan tâm",
};

function Face({ mood }: { mood: MascotMood }) {
  const stroke = { stroke: INK, strokeWidth: 3, strokeLinecap: "round" as const, fill: "none" };

  switch (mood) {
    case "cheer":
      return (
        <g>
          <path d="M46 62 Q51 55 56 62" {...stroke} />
          <path d="M68 62 Q73 55 78 62" {...stroke} />
          <path d="M53 69 Q62 84 71 69 Z" fill={INK} />
          <path d="M57 75 Q62 80 67 75 Q62 72 57 75 Z" fill="#ff8095" />
          {/* lấp lánh */}
          <path d="M104 22 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" fill="#f7c948" />
          <path d="M18 30 l1.5 3.5 3.5 1.5 -3.5 1.5 -1.5 3.5 -1.5 -3.5 -3.5 -1.5 3.5 -1.5 Z" fill="#3ee6a0" />
        </g>
      );
    case "calm":
      return (
        <g>
          <path d="M46 61 Q51 65 56 61" {...stroke} />
          <path d="M68 61 Q73 65 78 61" {...stroke} />
          <path d="M57 71 Q62 75 67 71" {...stroke} />
        </g>
      );
    case "sad":
      return (
        <g>
          {/* lông mày xếch lên ở giữa = buồn (ngược lại sẽ thành giận) */}
          <path d="M45 57 Q50 56 55 53" {...stroke} strokeWidth={2.4} />
          <path d="M79 57 Q74 56 69 53" {...stroke} strokeWidth={2.4} />
          <ellipse className="may-blink" cx="51" cy="63" rx="3.2" ry="4" fill={INK} />
          <ellipse className="may-blink" cx="73" cy="63" rx="3.2" ry="4" fill={INK} />
          <path d="M56 76 Q62 71 68 76" {...stroke} />
          <path d="M46 70 q-3 5 0 7 q3 -2 0 -7 Z" fill="#7cb6ff" />
        </g>
      );
    case "worried":
      return (
        <g>
          <path d="M45 56 Q50 53 55 55" {...stroke} strokeWidth={2.4} />
          <path d="M69 55 Q74 53 79 56" {...stroke} strokeWidth={2.4} />
          <ellipse className="may-blink" cx="51" cy="63" rx="3" ry="3.6" fill={INK} />
          <ellipse className="may-blink" cx="73" cy="63" rx="3" ry="3.6" fill={INK} />
          <path d="M54 74 q4 -3 8 0 t8 0" {...stroke} strokeWidth={2.6} />
        </g>
      );
    case "caring":
      // đang lắng nghe: mắt mở có ánh sáng, lông mày hơi nhướng, cười nhẹ, trái tim nhỏ cạnh má
      return (
        <g>
          <path d="M46 55 Q51 52.5 56 54" {...stroke} strokeWidth={2.2} />
          <path d="M68 54 Q73 52.5 78 55" {...stroke} strokeWidth={2.2} />
          <ellipse className="may-blink" cx="51" cy="62" rx="3.4" ry="4.4" fill={INK} />
          <ellipse className="may-blink" cx="73" cy="62" rx="3.4" ry="4.4" fill={INK} />
          <circle cx="52.3" cy="60.4" r="1.2" fill="#fff" />
          <circle cx="74.3" cy="60.4" r="1.2" fill="#fff" />
          <path d="M57 71 Q62 75 67 71" {...stroke} strokeWidth={2.6} />
          <path d="M92 64 c0 -3 -4 -4 -5 -1 c-1 -3 -5 -2 -5 1 c0 3 5 6 5 6 c0 0 5 -3 5 -6 Z" fill="#ff8095" />
        </g>
      );
    case "sleepy":
      return (
        <g>
          <path d="M46 62 H56" {...stroke} />
          <path d="M68 62 H78" {...stroke} />
          <ellipse cx="62" cy="73" rx="3" ry="3.4" fill={INK} />
          <text x="94" y="30" fontSize="12" fontWeight="700" fill="#8f9bb8">
            z
          </text>
          <text x="103" y="20" fontSize="9" fontWeight="700" fill="#8f9bb8">
            z
          </text>
        </g>
      );
    case "happy":
    default:
      return (
        <g>
          <ellipse className="may-blink" cx="51" cy="62" rx="3.4" ry="4.4" fill={INK} />
          <ellipse className="may-blink" cx="73" cy="62" rx="3.4" ry="4.4" fill={INK} />
          <circle cx="52.3" cy="60.4" r="1.1" fill="#fff" />
          <circle cx="74.3" cy="60.4" r="1.1" fill="#fff" />
          <path d="M55 70 Q62 77 69 70" {...stroke} />
        </g>
      );
  }
}
