import { versionInfo } from "@/lib/version";

/**
 * Dòng nhỏ cuối trang: bản F-Mood đang chạy (mã commit, nhánh, lúc triển khai) và mô hình AI đang cài.
 * P0 "Khóa phiên bản dùng thử": thầy cô và nhóm đối chiếu với nhật ký đợt thử (ho-so-du-thi/3-kiem-thu/nhat-ky-dot-thu.md).
 */
export async function VersionLine() {
  const v = await versionInfo();
  return (
    <p className="border-t border-line pt-4 text-xs text-muted">
      Phiên bản: <span className="font-semibold text-ink">{v.label}</span> · {v.modelsLabel}
    </p>
  );
}
