"use client";

import { useEffect, useRef } from "react";
import { recordOpen } from "@/app/actions/activity";

/**
 * Ghi một lượt mở (bài thư viện, việc nhỏ) khi trang hiện lên, một lần mỗi lần mở trang.
 * Ghi từ trình duyệt để trang được tải trước hay làm mới sau khi nộp bài không bị đếm thêm.
 */
export function TrackOpen({ kind, refCode }: { kind: "lesson" | "tiny_action"; refCode: string }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void recordOpen(kind, refCode).catch(() => {});
  }, [kind, refCode]);
  return null;
}
