/** Một khối có tiêu đề (Hôm nay, Hành trình): mọi khối cùng cỡ tiêu đề, cùng khoảng cách. */
export function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="font-display text-xl font-bold tracking-tight">
        {title}
        {note && <span className="ml-2 text-sm font-normal text-muted">{note}</span>}
      </h2>
      {children}
    </section>
  );
}

/** Dòng báo trống: cùng một kiểu cho mọi khối. */
export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-[var(--radius-card)] border border-dashed border-line p-4 text-muted">{children}</p>;
}
