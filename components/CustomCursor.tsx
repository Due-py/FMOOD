"use client";

import { useEffect, useRef } from "react";

// CON TRỎ TỰ VẼ (theo mẫu Inspiration 4)
// - chấm tròn đi theo chuột mượt mà, kéo dãn theo hướng & tốc độ di chuyển
// - đổi màu theo nền ngay dưới con trỏ: ĐEN trên nền sáng, TRẮNG trên nền tối / ảnh,
//   kèm viền mảnh màu ngược lại để luôn nhìn rõ
// - rê vào liên kết/nút: phình to; vào thẻ có data-cursor="view": vòng trắng có mũi tên;
//   vào phần tử có data-cursor-label="…": viên thuốc trắng có chữ
// - ô nhập chữ: ẩn đi, dùng con trỏ gõ chữ bình thường
// Chỉ bật với chuột (pointer: fine) và khi không bật "giảm chuyển động".

type Mode = "dot" | "link" | "view" | "label" | "hidden";

const SIZE: Record<Mode, number> = { dot: 18, link: 46, view: 72, label: 0, hidden: 18 };

type Tone = "dark" | "light"; // màu của con trỏ

/** Độ sáng (0 = đen, 1 = trắng) của một màu CSS đã tính; null nếu trong suốt / không đọc được. */
function lightness(color: string): number | null {
  const m = color.match(/(rgba?|color|oklab|oklch)\(([^)]*)\)/);
  if (!m) return null;
  const nums = m[2].replace(/srgb|[\/,]/g, " ").trim().split(/\s+/).map(parseFloat);
  const kind = m[1];
  if (kind === "oklab" || kind === "oklch") {
    const alpha = nums[3] ?? 1;
    if (alpha < 0.5) return null;
    return nums[0] > 1 ? nums[0] / 100 : nums[0];
  }
  const scale = kind === "color" ? 1 : 255;
  const [r, g, b, a = 1] = nums;
  if (a < 0.5) return null;
  const lin = (c: number) => {
    const v = c / scale;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  // độ chói tương đối → độ sáng cảm nhận
  return Math.cbrt(0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b));
}

/** Con trỏ nên màu gì khi nằm trên phần tử này: nền sáng → đen, nền tối / ảnh → trắng. */
function toneFor(el: Element | null): Tone {
  let node: Element | null = el;
  while (node && node !== document.documentElement) {
    if (/^(IMG|VIDEO|CANVAS|PICTURE)$/.test(node.tagName)) return "light";
    const cs = getComputedStyle(node);
    const bg = lightness(cs.backgroundColor);
    if (bg !== null) return bg < 0.58 ? "light" : "dark";
    if (cs.backgroundImage && cs.backgroundImage !== "none") {
      const g = lightness(cs.backgroundImage);
      if (g !== null) return g < 0.58 ? "light" : "dark";
      if (cs.backgroundImage.includes("url(")) return "light";
    }
    node = node.parentElement;
  }
  return document.documentElement.classList.contains("dark") ? "light" : "dark";
}

export function CustomCursor() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const shapeRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const iconRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fine = matchMedia("(pointer: fine) and (hover: hover)");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduce.matches) return;

    const wrap = wrapRef.current!;
    const shape = shapeRef.current!;
    const label = labelRef.current!;
    const icon = iconRef.current!;
    document.documentElement.classList.add("custom-cursor");

    const target = { x: -100, y: -100 };
    const pos = { x: -100, y: -100 };
    let mode: Mode = "dot";
    let pressed = false;
    let visible = false;
    let raf = 0;

    function setMode(next: Mode, text = "") {
      if (next === mode && (next !== "label" || label.textContent === text)) return;
      mode = next;
      shape.dataset.mode = next;
      label.textContent = next === "label" ? text : "";
      icon.style.opacity = next === "view" ? "1" : "0";
      const size = SIZE[next];
      if (next === "label") {
        shape.style.width = "auto";
        shape.style.height = "40px";
      } else {
        shape.style.width = `${size}px`;
        shape.style.height = `${size}px`;
      }
    }

    function modeFor(el: Element | null): { mode: Mode; text?: string } {
      if (!el) return { mode: "dot" };
      if (el.closest("input, textarea, select, [contenteditable='true']")) return { mode: "hidden" };
      const labelled = el.closest<HTMLElement>("[data-cursor-label]");
      if (labelled) return { mode: "label", text: labelled.dataset.cursorLabel };
      if (el.closest("[data-cursor='view']")) return { mode: "view" };
      if (el.closest("a, button, [role='button'], [role='tab'], [role='radio'], label, summary")) return { mode: "link" };
      return { mode: "dot" };
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      target.x = e.clientX;
      target.y = e.clientY;
      if (!visible) {
        visible = true;
        pos.x = target.x;
        pos.y = target.y;
        wrap.style.opacity = "1";
      }
    };
    const onOver = (e: PointerEvent) => {
      const el = e.target as Element;
      const m = modeFor(el);
      setMode(m.mode, m.text);
      shape.dataset.tone = toneFor(el);
    };
    const onDown = () => (pressed = true);
    const onUp = () => (pressed = false);
    const onLeave = () => {
      visible = false;
      wrap.style.opacity = "0";
    };

    const tick = () => {
      const dx = target.x - pos.x;
      const dy = target.y - pos.y;
      pos.x += dx * 0.22;
      pos.y += dy * 0.22;
      wrap.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;

      // kéo dãn theo vận tốc (chỉ với chấm nhỏ / vòng liên kết)
      const speed = Math.hypot(dx, dy);
      const stretch = mode === "dot" || mode === "link" ? Math.min(speed / 60, 0.55) : 0;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      const press = pressed ? 0.8 : 1;
      shape.style.transform = `translate(-50%, -50%) rotate(${stretch ? angle : 0}deg) scale(${(1 + stretch) * press}, ${(1 - stretch * 0.45) * press})`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.documentElement.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.documentElement.classList.remove("custom-cursor");
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[1000] opacity-0 transition-opacity duration-300"
      style={{ transform: "translate3d(-100px,-100px,0)" }}
    >
      <div ref={shapeRef} data-mode="dot" data-tone="dark" className="fmood-cursor">
        <span ref={labelRef} className="whitespace-nowrap px-4 text-xs font-extrabold uppercase tracking-[0.12em]" />
        <span ref={iconRef} className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17 17 7M8 7h9v9" />
          </svg>
        </span>
      </div>
    </div>
  );
}
