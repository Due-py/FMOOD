"use client";

import { motion, useReducedMotion } from "motion/react";
import { May } from "@/components/mascot/May";
import type { MascotMood } from "@/lib/mascot";

// Các vòng tròn lơ lửng quanh tiêu đề (như phần "Join Us" trong mẫu Inspiration 1),
// mỗi vòng là Mây với một tâm trạng khác nhau.
const BUBBLES: { mood: MascotMood; size: number; x: string; y: string; bg: string; delay: number }[] = [
  { mood: "happy", size: 120, x: "4%", y: "18%", bg: "bg-sky", delay: 0 },
  { mood: "calm", size: 70, x: "14%", y: "68%", bg: "bg-mint", delay: 0.6 },
  { mood: "sad", size: 88, x: "22%", y: "2%", bg: "bg-lilac", delay: 1.2 },
  { mood: "cheer", size: 130, x: "78%", y: "10%", bg: "bg-butter", delay: 0.3 },
  { mood: "worried", size: 76, x: "88%", y: "62%", bg: "bg-peach", delay: 0.9 },
  { mood: "sleepy", size: 60, x: "70%", y: "76%", bg: "bg-sky", delay: 1.5 },
];

export function FloatingBubbles() {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block">
      {BUBBLES.map((b, i) => (
        <motion.div
          key={i}
          className={`absolute flex items-center justify-center rounded-full ${b.bg} shadow-[0_20px_40px_-24px_rgba(60,40,10,0.4)]`}
          style={{ left: b.x, top: b.y, width: b.size, height: b.size }}
          initial={reduce ? false : { opacity: 0, scale: 0.6 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          animate={reduce ? undefined : { y: [0, -14, 0] }}
          transition={{
            opacity: { duration: 0.8, delay: b.delay * 0.4 },
            scale: { duration: 0.8, delay: b.delay * 0.4, ease: [0.22, 1, 0.36, 1] },
            y: { duration: 5 + i * 0.6, repeat: Infinity, ease: "easeInOut", delay: b.delay },
          }}
        >
          <May size={b.size * 0.7} mood={b.mood} float={false} />
        </motion.div>
      ))}
    </div>
  );
}
