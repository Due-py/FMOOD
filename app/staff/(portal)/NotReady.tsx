/** Trang cần bảng mới (migration 0012) mà cơ sở dữ liệu chưa được cập nhật. */
export function NotReady() {
  return (
    <p className="rounded-[var(--radius-card)] bg-butter p-6 text-center">
      <span className="block font-semibold">Phần này chưa mở</span>
      <span className="mt-1 block text-sm text-muted">Cần chạy cập nhật cơ sở dữ liệu 0012_trang_thay_co.sql trước.</span>
    </p>
  );
}
