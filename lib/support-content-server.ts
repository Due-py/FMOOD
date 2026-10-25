import "server-only";
import type { Profile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isVisible, type ContentKind, type ContentStatus, type SupportItem } from "./support-content";

// Đọc nội dung vòng hỗ trợ (quyền server). Chưa chạy migration 0010 thì coi như chưa có nội dung.

const MISSING = new Set(["42P01", "42703", "PGRST205"]);
const COLUMNS = "id, key, kind, topic, sort_order, data, status, reviewed_by_name, reviewed_at";

type Row = {
  id: string;
  key: string;
  kind: ContentKind;
  topic: string | null;
  sort_order: number;
  data: Record<string, unknown>;
  status: ContentStatus;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
};

const toItem = (r: Row): SupportItem => ({
  id: r.id,
  key: r.key,
  kind: r.kind,
  topic: r.topic,
  sortOrder: r.sort_order,
  data: r.data,
  status: r.status,
  reviewedByName: r.reviewed_by_name,
  reviewedAt: r.reviewed_at,
});

/** Toàn bộ nội dung (trang duyệt). `ready = false` khi chưa chạy migration 0010. */
export async function allContent(): Promise<{ ready: boolean; items: SupportItem[] }> {
  const { data, error } = await createAdminClient().from("support_content").select(COLUMNS).order("kind").order("topic").order("sort_order");
  if (error) {
    if (!MISSING.has(error.code)) console.error("[F-Mood] Đọc nội dung vòng hỗ trợ lỗi", error);
    return { ready: false, items: [] };
  }
  return { ready: true, items: ((data ?? []) as Row[]).map(toItem) };
}

/** Lớp này có phải lớp thử không. */
export async function isTestClass(classId: string | null): Promise<boolean> {
  if (!classId) return false;
  const { data, error } = await createAdminClient().from("classes").select("is_test").eq("id", classId).maybeSingle();
  if (error && !MISSING.has(error.code)) console.error("[F-Mood] Đọc lớp thử lỗi", error);
  return data?.is_test === true;
}

/** Nội dung học sinh này được thấy (theo trạng thái và lớp thử), lọc theo loại nếu cần. */
export async function contentForProfile(profile: Profile, kinds?: ContentKind[]): Promise<SupportItem[]> {
  let query = createAdminClient().from("support_content").select(COLUMNS).neq("status", "off");
  if (kinds?.length) query = query.in("kind", kinds);
  const [{ data, error }, testClass] = await Promise.all([query.order("sort_order"), isTestClass(profile.class_id)]);
  if (error) {
    if (!MISSING.has(error.code)) console.error("[F-Mood] Đọc nội dung vòng hỗ trợ lỗi", error);
    return [];
  }
  return ((data ?? []) as Row[]).filter((r) => isVisible(r.status, testClass)).map(toItem);
}
