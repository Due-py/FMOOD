"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "motion/react";
import { useState, type ReactNode } from "react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

/**
 * Thẻ nghiêng 3D theo con trỏ, kèm vệt sáng lướt qua.
 * Chỉ chạy với chuột (máy cảm ứng và "giảm chuyển động" thì đứng yên).
 */
export function Tilt({
  children,
  className = "",
  max = 7,
}: {
  children: ReactNode;
  className?: string;
  /** góc nghiêng tối đa (độ) */
  max?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(false);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 220, damping: 20, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const glareX = useTransform(px, [0, 1], [0, 100]);
  const glareY = useTransform(py, [0, 1], [0, 100]);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.35), transparent 55%)`;

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <div className={`[perspective:900px] ${className}`}>
      <motion.div
        className="relative h-full [transform-style:preserve-3d]"
        style={{ rotateX, rotateY }}
        whileHover={{ scale: 1.015 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          px.set((e.clientX - r.left) / r.width);
          py.set((e.clientY - r.top) / r.height);
          if (!active) setActive(true);
        }}
        onPointerLeave={() => {
          px.set(0.5);
          py.set(0.5);
          setActive(false);
        }}
      >
        {children}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-soft-light transition-opacity duration-300"
          style={{ background: glare, opacity: active ? 1 : 0, borderRadius: "var(--radius-card)" }}
        />
      </motion.div>
    </div>
  );
}
