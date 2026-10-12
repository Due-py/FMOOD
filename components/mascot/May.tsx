"use client";

import { AnimatePresence, motion, useAnimate } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import type { MascotMood } from "@/lib/mascot";

type Props = {
  mood?: MascotMood;
  size?: number;
  float?: boolean;
  className?: string;
  /**
   * Mây "sống": thở, chớp mắt, nhìn theo con trỏ, vẫy tay chào, bấm vào thì nhảy lên.
   * Mặc định bật cho Mây cỡ lớn đang bay (float), tắt cho Mây nhỏ làm biểu tượng.
   */
  live?: boolean;
};

const INK = "#2b2a33";

/** Mây: linh vật đám mây của F-Mood, vẽ bằng SVG, biểu cảm đổi theo tâm trạng. */
export function May({ mood = "happy", size = 120, float = true, className = "", live }: Props) {
  const reduced = usePrefersReducedMotion();
  const isLive = (live ?? (float && size >= 60)) && !reduced;
  if (!isLive) return <StaticMay mood={mood} size={size} float={float && !reduced} className={className} />;
  return <LiveMay mood={mood} size={size} className={className} />;
}

const MOOD_LABEL: Record<MascotMood, string> = {
  happy: "vui vẻ",
  calm: "bình yên",
  sad: "đồng cảm",
  worried: "lo lắng",
  sleepy: "buồn ngủ",
  cheer: "reo vui",
};

function svgProps(size: number, mood: MascotMood) {
  return {
    viewBox: "0 0 124 104",
    width: size,
    height: (size * 104) / 124,
    role: "img",
    "aria-label": `Mây (${MOOD_LABEL[mood]})`,
  } as const;
}

/** Thân mây (dùng chung cho bản tĩnh và bản động). */
function Body() {
  return (
    <>
      <circle cx="38" cy="60" r="24" />
      <circle cx="62" cy="42" r="29" />
      <circle cx="89" cy="57" r="23" />
      <rect x="24" y="52" width="80" height="36" rx="18" />
    </>
  );
}

function Cheeks() {
  return (
    <>
      <ellipse cx="41" cy="70" rx="6" ry="3.6" fill="#ff9fb2" opacity="0.55" />
      <ellipse cx="83" cy="70" rx="6" ry="3.6" fill="#ff9fb2" opacity="0.55" />
    </>
  );
}

const BODY_CLASS = "fill-white dark:fill-[#e6f5ec]";
const BODY_SHADOW = { filter: "drop-shadow(0 4px 8px rgba(40, 30, 10, 0.10))" };

/** Mây tĩnh: icon nhỏ, Mây trong danh sách, hoặc khi bật "giảm chuyển động". */
function StaticMay({ mood, size, float, className }: { mood: MascotMood; size: number; float: boolean; className: string }) {
  return (
    <svg {...svgProps(size, mood)} className={`${float ? "may-float" : ""} shrink-0 overflow-visible ${className}`}>
      <ellipse cx="62" cy="98" rx="34" ry="4" fill="currentColor" opacity="0.08" />
      <g className={BODY_CLASS} style={BODY_SHADOW}>
        <Body />
      </g>
      <Cheeks />
      <Face mood={mood} cssBlink />
    </svg>
  );
}

// ───────────── Mây động ─────────────

/** Vị trí con trỏ dùng chung cho mọi Mây trên trang (một listener duy nhất). */
const pointer = { x: 0, y: 0, listeners: new Set<() => void>(), bound: false };
function subscribePointer(fn: () => void) {
  if (!pointer.bound && typeof window !== "undefined") {
    pointer.bound = true;
    let frame = 0;
    window.addEventListener(
      "pointermove",
      (e) => {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
        if (!frame) {
          frame = requestAnimationFrame(() => {
            frame = 0;
            pointer.listeners.forEach((l) => l());
          });
        }
      },
      { passive: true },
    );
  }
  pointer.listeners.add(fn);
  return () => void pointer.listeners.delete(fn);
}

const ARM_STYLE = { transformBox: "fill-box", originX: 0.5, originY: 0.15 } as const;

function LiveMay({ mood, size, className }: { mood: MascotMood; size: number; className: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [scope, animate] = useAnimate<SVGGElement>();
  const [blink, setBlink] = useState(false);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [poked, setPoked] = useState(0);
  const [giggling, setGiggling] = useState(false);
  const [waving, setWaving] = useState(true);

  // chớp mắt ngẫu nhiên 2.5–6 giây một lần
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      timer = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 130);
        loop();
      }, 2500 + Math.random() * 3500);
    };
    loop();
    return () => clearTimeout(timer);
  }, []);

  // vẫy tay chào lúc mới hiện ra
  useEffect(() => {
    const t = setTimeout(() => setWaving(false), 1900);
    return () => clearTimeout(t);
  }, []);

  // mắt nhìn theo con trỏ (chỉ máy có chuột)
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    return subscribePointer(() => {
      const box = svgRef.current?.getBoundingClientRect();
      if (!box) return;
      const dx = pointer.x - (box.left + box.width / 2);
      const dy = pointer.y - (box.top + box.height * 0.6);
      const dist = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, dist / 300);
      setLook({ x: (dx / dist) * 2.6 * reach, y: (dy / dist) * 1.8 * reach });
    });
  }, []);

  function poke() {
    setPoked((n) => n + 1);
    setGiggling(true);
    setTimeout(() => setGiggling(false), 1100);
    void animate(
      scope.current,
      { y: [0, -18, 0, -5, 0], scaleY: [1, 1.08, 0.86, 1.03, 1], scaleX: [1, 0.94, 1.1, 0.98, 1] },
      { duration: 0.75, ease: "easeOut" },
    );
  }

  const face: MascotMood = giggling ? "cheer" : mood;

  return (
    <motion.svg
      ref={svgRef}
      {...svgProps(size, mood)}
      className={`shrink-0 cursor-pointer touch-manipulation overflow-visible ${className}`}
      onPointerDown={poke}
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
    >
      <title>Chạm vào Mây thử xem</title>
      <motion.ellipse
        cx="62"
        cy="98"
        rx="34"
        ry="4"
        fill="currentColor"
        opacity="0.08"
        animate={{ scaleX: [1, 0.9, 1] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformBox: "fill-box", originX: 0.5 }}
      />

      <g ref={scope} style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
        {/* thở: co giãn nhẹ, gốc ở đáy */}
        <motion.g
          animate={{ scaleY: [1, 1.03, 1], scaleX: [1, 0.988, 1] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformBox: "fill-box", originX: 0.5, originY: 1 }}
        >
          {/* tay (nằm sau thân, ló ra hai bên) */}
          <g className={BODY_CLASS} style={BODY_SHADOW}>
            <motion.ellipse
              cx="12"
              cy="74"
              rx="6.5"
              ry="9.5"
              style={ARM_STYLE}
              animate={{ rotate: giggling ? [0, 35, 10, 35, 0] : [8, 14, 8] }}
              transition={giggling ? { duration: 0.8 } : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.ellipse
              cx="112"
              cy="74"
              rx="6.5"
              ry="9.5"
              style={ARM_STYLE}
              animate={{
                rotate: waving || giggling ? [-10, -150, -110, -150, -110, -150, -10] : [-8, -14, -8],
              }}
              transition={
                waving || giggling ? { duration: 1.6, ease: "easeInOut" } : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }
              }
            />
            <Body />
          </g>
          <Cheeks />

          {/* mặt: nghiêng nhẹ theo hướng nhìn, đổi biểu cảm mượt */}
          <motion.g animate={{ x: look.x, y: look.y }} transition={{ type: "spring", stiffness: 180, damping: 18 }}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.g
                key={face}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ type: "spring", stiffness: 420, damping: 22 }}
                style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
              >
                <Face mood={face} blink={blink} />
              </motion.g>
            </AnimatePresence>
          </motion.g>
        </motion.g>
      </g>

      {/* lấp lánh khi được chạm */}
      <AnimatePresence>{giggling && <Sparkles key={poked} />}</AnimatePresence>
    </motion.svg>
  );
}

const SPARKS = [
  { x: -46, y: -30, c: "#f7c948" },
  { x: 48, y: -34, c: "#3ee6a0" },
  { x: -56, y: 6, c: "#ff9fb2" },
  { x: 58, y: 2, c: "#7cb6ff" },
  { x: 0, y: -50, c: "#f59f3a" },
];

function Sparkles() {
  return (
    <g>
      {SPARKS.map((s, i) => (
        <motion.path
          key={i}
          d="M62 40 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z"
          fill={s.c}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{ x: s.x, y: s.y, scale: [0, 1.4, 1], opacity: [1, 1, 0], rotate: 90 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeOut", delay: i * 0.03 }}
          style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
        />
      ))}
    </g>
  );
}

// ───────────── Khuôn mặt ─────────────

function Eye({ cx, cy, rx, ry, blink, cssBlink, shine }: { cx: number; cy: number; rx: number; ry: number; blink?: boolean; cssBlink?: boolean; shine?: boolean }) {
  return (
    <>
      <ellipse className={cssBlink ? "may-blink" : undefined} cx={cx} cy={cy} rx={rx} ry={blink ? 0.7 : ry} fill={INK} />
      {shine && !blink && <circle cx={cx + 1.3} cy={cy - 1.6} r="1.1" fill="#fff" />}
    </>
  );
}

function Face({ mood, blink, cssBlink }: { mood: MascotMood; blink?: boolean; cssBlink?: boolean }) {
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
          <Eye cx={51} cy={63} rx={3.2} ry={4} blink={blink} cssBlink={cssBlink} />
          <Eye cx={73} cy={63} rx={3.2} ry={4} blink={blink} cssBlink={cssBlink} />
          <path d="M56 76 Q62 71 68 76" {...stroke} />
          <path d="M46 70 q-3 5 0 7 q3 -2 0 -7 Z" fill="#7cb6ff" />
        </g>
      );
    case "worried":
      return (
        <g>
          <path d="M45 56 Q50 53 55 55" {...stroke} strokeWidth={2.4} />
          <path d="M69 55 Q74 53 79 56" {...stroke} strokeWidth={2.4} />
          <Eye cx={51} cy={63} rx={3} ry={3.6} blink={blink} cssBlink={cssBlink} />
          <Eye cx={73} cy={63} rx={3} ry={3.6} blink={blink} cssBlink={cssBlink} />
          <path d="M54 74 q4 -3 8 0 t8 0" {...stroke} strokeWidth={2.6} />
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
          <Eye cx={51} cy={62} rx={3.4} ry={4.4} blink={blink} cssBlink={cssBlink} shine />
          <Eye cx={73} cy={62} rx={3.4} ry={4.4} blink={blink} cssBlink={cssBlink} shine />
          <path d="M55 70 Q62 77 69 70" {...stroke} />
        </g>
      );
  }
}
