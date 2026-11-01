/**
 * Khung "đang tải" khi chuyển giữa các trang học sinh (01/11): bấm menu là màn hình đổi ngay, không đứng yên chờ máy chủ.
 * Next.js tải sẵn khung này cùng link menu, nội dung thật thay vào khi máy chủ dựng xong.
 * Cùng bố cục với các trang (tiêu đề, một dòng mô tả, các thẻ) để lúc nội dung hiện ra không bị giật.
 * data-dang-tai: công cụ đo chuyển trang (ho-so-du-thi/3-kiem-thu/toc-do/cong-cu/chuyen-trang.py) dựa vào đây.
 */
export default function Loading() {
  return (
    <div data-dang-tai aria-busy="true" className="space-y-5">
      <span className="sr-only" role="status">
        Đang tải…
      </span>
      <div aria-hidden className="space-y-5 motion-safe:animate-pulse">
        <div>
          <div className="h-8 w-40 rounded-lg bg-line" />
          <div className="mt-2 h-4 w-full max-w-md rounded bg-line/70" />
        </div>
        <div className="h-20 rounded-[var(--radius-card)] border border-line bg-surface" />
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
          <div className="h-40 rounded-[var(--radius-card)] border border-line bg-surface" />
          <div className="h-40 rounded-[var(--radius-card)] border border-line bg-surface" />
        </div>
      </div>
    </div>
  );
}
