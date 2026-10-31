import type { Metadata } from "next";
import { pageGrants, requirePage } from "@/lib/permissions";
import { getSettingMeta } from "@/lib/settings";
import { PageHeader } from "@/components/PageHeader";
import { PermissionTable } from "./PermissionTable";

export const metadata: Metadata = { title: "Phân quyền" };

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "numeric", month: "numeric", year: "numeric" }).format(
    new Date(iso),
  );
}

// Bước 11: admin chọn mỗi nhóm thành viên được mở những trang nào. Chỉ admin (ô khóa, không mở cho ai được).
export default async function PermissionsPage() {
  await requirePage("/staff/phan-quyen");
  const [grants, meta] = await Promise.all([pageGrants(), getSettingMeta("staff.pages")]);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Chỉ admin" title="Phân quyền">
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Chọn mỗi nhóm được mở những trang nào trong trang thầy cô. Đổi ô nào là có hiệu lực ngay (thanh bên, mở thẳng đường dẫn,
          và mọi thao tác của trang đó) và được ghi vào Nhật ký hoạt động. Admin luôn mở được mọi trang.
        </p>
      </PageHeader>

      <ul className="max-w-3xl space-y-1 rounded-[var(--radius-card)] bg-surface-2 px-5 py-4 text-sm">
        <li>
          🔒 <strong>Ô có khóa</strong> không đổi được, để quyền trang không vượt quyền dữ liệu. Di chuột hoặc chạm vào ổ khóa để xem lý do.
        </li>
        <li>
          👀 Mở trang <strong>không</strong> mở thêm dữ liệu: GVCN không bao giờ đọc được nội dung tin nhắn, bài luyện hay bài đo, dù được mở
          trang nào. Mỗi trang vẫn chỉ hiện lớp của người xem.
        </li>
        <li>
          ✍️ <strong>Người chấm</strong> là GVCN hoặc tư vấn viên được giao chấm ở trang Chấm bài. Họ có thêm trang chấm bài, ngoài các trang
          của nhóm mình.
        </li>
      </ul>

      <PermissionTable initial={grants} updated={meta.updatedAt ? `${meta.updatedBy ?? "?"} · ${formatDateTime(meta.updatedAt)}` : null} />
    </div>
  );
}
