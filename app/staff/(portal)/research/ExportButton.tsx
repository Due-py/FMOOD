"use client";

import { recordExport } from "@/app/actions/activity";
import { btn } from "@/components/ui/styles";

/** Tải bảng số liệu dạng CSV (mở được bằng Excel / Google Sheets). */
export function ExportButton({ rows, filename = "fmood-ket-qua-nghien-cuu.csv" }: { rows: (string | number)[][]; filename?: string }) {
  return (
    <button
      type="button"
      className={btn.secondary}
      onClick={() => {
        const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
        // BOM để Excel đọc đúng tiếng Việt
        const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        // nhật ký hoạt động: ghi là đã xuất file nào, bao nhiêu dòng (không gửi lại số liệu)
        void recordExport(filename, Math.max(0, rows.length - 1), window.location.pathname).catch(() => {});
      }}
    >
      ⬇ Tải CSV
    </button>
  );
}
