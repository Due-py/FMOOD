// PHÁO GIẤY ĂN MỪNG (chạy trong trình duyệt, không cần thư viện).
// Gọi celebrate() sau một việc tốt: check-in xong, tick thói quen, lưu bài tập...
// Tự tắt khi người dùng bật "giảm chuyển động".

const COLORS = ["#34d36e", "#f7c948", "#ff9fb2", "#7cb6ff", "#c46ad8", "#f59f3a"];

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rot: number;
  vr: number;
  shape: 0 | 1;
};

/**
 * Bắn pháo giấy từ một điểm (mặc định giữa màn hình) hoặc từ giữa một phần tử.
 * `amount` khoảng 30 (nhỏ) đến 120 (lớn).
 */
export function celebrate(from?: Element | { x: number; y: number } | null, amount = 70) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let ox = window.innerWidth / 2;
  let oy = window.innerHeight / 2;
  if (from instanceof Element) {
    const r = from.getBoundingClientRect();
    ox = r.left + r.width / 2;
    oy = r.top + r.height / 2;
  } else if (from) {
    ox = from.x;
    oy = from.y;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "100" });
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  const parts: Particle[] = Array.from({ length: amount }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
    const speed = 6 + Math.random() * 8;
    return {
      x: ox,
      y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 5 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      shape: Math.random() < 0.6 ? 0 : 1,
    };
  });

  const start = performance.now();
  const DURATION = 1800;
  const tick = (now: number) => {
    const t = now - start;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const fade = Math.max(0, 1 - Math.max(0, t - DURATION * 0.6) / (DURATION * 0.4));
    for (const p of parts) {
      p.vy += 0.32; // trọng lực
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 0) ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (t < DURATION) requestAnimationFrame(tick);
    else canvas.remove();
  };
  requestAnimationFrame(tick);
}
