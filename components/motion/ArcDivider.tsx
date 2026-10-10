/** Mép cong mềm giữa hai khối nền (như phần "Our impact" trong mẫu Inspiration 1). */
export function ArcDivider({ className = "text-cream", flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      className={`block h-14 w-full sm:h-24 ${flip ? "rotate-180" : ""} ${className}`}
    >
      <path d="M0 120 C 360 0, 1080 0, 1440 120 Z" fill="currentColor" />
    </svg>
  );
}
