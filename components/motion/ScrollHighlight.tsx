"use client";

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";
import { cn } from "@/components/ui/cn";

/**
 * Câu chữ lớn "sáng dần" từng từ theo thanh cuộn (như mẫu Inspiration 2).
 * Từ nằm trong *dấu sao* sẽ sáng thành màu xanh.
 */
export function ScrollHighlight({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const words = text.split(/\s+/).map((w) => ({ word: w.replace(/\*/g, ""), accent: /^\*.*\*[.,!?]*$/.test(w) }));

  return (
    <p ref={ref} className={cn("font-display font-extrabold tracking-tight", className)}>
      {words.map((w, i) => (
        <Word
          key={i}
          progress={scrollYProgress}
          range={[i / words.length, (i + 1) / words.length]}
          accent={w.accent}
          still={Boolean(reduce)}
        >
          {w.word}
        </Word>
      ))}
    </p>
  );
}

function Word({
  children,
  progress,
  range,
  accent,
  still,
}: {
  children: string;
  progress: MotionValue<number>;
  range: [number, number];
  accent: boolean;
  still: boolean;
}) {
  const opacity = useTransform(progress, range, [0.18, 1]);
  return (
    <>
      <motion.span
        style={still ? undefined : { opacity }}
        className={accent ? "text-brand-strong dark:text-brand" : undefined}
      >
        {children}
      </motion.span>{" "}
    </>
  );
}
