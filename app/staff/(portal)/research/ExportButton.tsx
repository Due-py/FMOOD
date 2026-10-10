"use client";

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
      }}
    >
      ⬇ Tải CSV
    </button>
  );
}
