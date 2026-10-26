import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getCurrentProfile, type Profile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  allowsClass,
  allowsUser,
  classScopeFor,
  DEMO_COOKIE,
  DEMO_REGISTRY_KEY,
  type ClassScope,
  type DemoRegistry,
} from "./shared";

// CHẾ ĐỘ TRÌNH DIỄN (phía máy chủ): đọc sổ ghi tài khoản mẫu và biết người đang xem có bật trình diễn không.
// Mọi hàm đọc dữ liệu cho trang thầy cô đi qua đây để: bật → chỉ dữ liệu mẫu; tắt → không bao giờ có dữ liệu mẫu.

/** Sổ ghi tài khoản mẫu (null khi chưa tạo dữ liệu mẫu). Mỗi lần mở trang chỉ đọc một lần. */
export const demoRegistry = cache(async (): Promise<DemoRegistry | null> => {
  const { data } = await createAdminClient().from("app_settings").select("value").eq("key", DEMO_REGISTRY_KEY).maybeSingle();
  return (data?.value as DemoRegistry | undefined) ?? null;
});

/** Người đang xem là admin VÀ đã bật trình diễn trên máy này. Gọi ngoài một lần mở trang (script) thì luôn tắt. */
export const demoOn = cache(async (): Promise<boolean> => {
  try {
    const profile = await getCurrentProfile();
    if (profile?.role !== "admin") return false;
    return (await cookies()).get(DEMO_COOKIE)?.value === "1";
  } catch {
    return false;
  }
});

export type DataScope = {
  demo: boolean;
  registry: DemoRegistry | null;
  /** tài khoản mẫu (học sinh + thầy cô) */
  demoUsers: ReadonlySet<string>;
  /** dòng của người này có được tính / hiện không */
  userOk: (userId: string | null | undefined) => boolean;
  /** dòng của lớp này có được tính / hiện không (theo admin / phòng tham vấn) */
  classOk: (classId: string | null | undefined) => boolean;
};

/** Phạm vi dữ liệu của lần mở trang này (dùng cho số liệu toàn trường: nghiên cứu, kết quả, thành viên). */
export const dataScope = cache(async (): Promise<DataScope> => {
  const [demo, registry] = await Promise.all([demoOn(), demoRegistry()]);
  const demoUsers = new Set([...(registry?.studentIds ?? []), ...(registry?.staffIds ?? [])]);
  const scope = classScopeFor("admin", { demo, demoClassIds: registry?.classIds ?? [], ownClassIds: [] });
  return {
    demo,
    registry,
    demoUsers,
    userOk: (id) => allowsUser(demo, demoUsers, id),
    classOk: (id) => allowsClass(scope, id),
  };
});

/** Phạm vi lớp của một người (giáo viên: lớp mình; admin trình diễn: lớp mẫu; còn lại: mọi lớp trừ lớp mẫu). */
export async function classScope(profile: Profile): Promise<ClassScope> {
  const [demo, registry] = await Promise.all([demoOn(), demoRegistry()]);
  // tư vấn viên mẫu (dùng để cho thấy "ai thấy gì" trong trình diễn) chỉ bao giờ thấy lớp mẫu
  if (registry?.staffIds.includes(profile.id) && profile.role !== "teacher") return { kind: "only", ids: registry.classIds };
  let own: string[] = [];
  if (profile.role === "teacher") {
    const { data } = await createAdminClient().from("classes").select("id").eq("homeroom_teacher_id", profile.id);
    own = (data ?? []).map((c) => c.id as string);
  }
  // demoOn() là của NGƯỜI ĐANG XEM; chỉ áp dụng khi đang hỏi đúng cho chính admin đó
  const viewer = await getCurrentProfile().catch(() => null);
  return classScopeFor(profile.role, {
    demo: demo && viewer?.id === profile.id,
    demoClassIds: registry?.classIds ?? [],
    ownClassIds: own,
  });
}

const NONE = "00000000-0000-0000-0000-000000000000";

/** Lọc truy vấn theo phạm vi lớp. */
export function inClassScope<Q>(query: Q, scope: ClassScope, column = "class_id"): Q {
  const q = query as unknown as { in(c: string, v: string[]): Q; or(f: string): Q };
  if (scope.kind === "only") return q.in(column, scope.ids.length ? scope.ids : [NONE]);
  if (scope.kind === "except") return q.or(`${column}.is.null,${column}.not.in.(${scope.ids.join(",")})`);
  return query;
}

/** Lọc truy vấn theo tài khoản: trình diễn → chỉ tài khoản mẫu; bình thường → bỏ tài khoản mẫu. */
export function inUserScope<Q>(query: Q, scope: DataScope, column = "user_id"): Q {
  const q = query as unknown as { in(c: string, v: string[]): Q; not(c: string, op: string, v: string): Q };
  const ids = [...scope.demoUsers];
  if (scope.demo) return q.in(column, ids.length ? ids : [NONE]);
  return ids.length ? q.not(column, "in", `(${ids.join(",")})`) : query;
}

export type DemoOverview = {
  createdAt: string;
  createdBy: string;
  status: DemoRegistry["status"];
  classes: { id: string; name: string; code: string; students: number; teacher: string | null }[];
  staff: number;
  students: number;
  counts: { checkins: number; worries: number; alerts: number; openAlerts: number; help: number };
};

/** Tóm tắt dữ liệu mẫu cho trang Trình diễn (null khi chưa tạo). */
export async function demoOverview(): Promise<DemoOverview | null> {
  const registry = await demoRegistry();
  if (!registry) return null;
  const db = createAdminClient();
  const students = registry.studentIds.length ? registry.studentIds : [NONE];
  const classIds = registry.classIds.length ? registry.classIds : [NONE];
  const [classes, profiles, checkins, worries, alerts, help] = await Promise.all([
    db.from("classes").select("id, name, code, homeroom:profiles!classes_homeroom_teacher_id_fkey(nickname)").in("id", classIds).order("name"),
    db.from("profiles").select("class_id").in("id", students),
    db.from("checkins").select("id", { count: "exact", head: true }).in("user_id", students),
    db.from("worries").select("id", { count: "exact", head: true }).in("user_id", students),
    db.from("alerts").select("status").in("class_id", classIds),
    db.from("help_requests").select("id", { count: "exact", head: true }).in("class_id", classIds),
  ]);
  const per = new Map<string, number>();
  for (const p of profiles.data ?? []) if (p.class_id) per.set(p.class_id, (per.get(p.class_id) ?? 0) + 1);
  return {
    createdAt: registry.createdAt,
    createdBy: registry.createdBy,
    status: registry.status,
    classes: (classes.data ?? []).map((c) => ({
      id: c.id as string,
      name: c.name as string,
      code: c.code as string,
      students: per.get(c.id as string) ?? 0,
      teacher: (c.homeroom as unknown as { nickname: string } | null)?.nickname ?? null,
    })),
    staff: registry.staffIds.length,
    students: registry.studentIds.length,
    counts: {
      checkins: checkins.count ?? 0,
      worries: worries.count ?? 0,
      alerts: alerts.data?.length ?? 0,
      openAlerts: (alerts.data ?? []).filter((a) => a.status !== "resolved").length,
      help: help.count ?? 0,
    },
  };
}
