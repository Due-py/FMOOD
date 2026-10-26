import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildDemo, type DemoData } from "./generate";
import { demoEmail, DEMO_REGISTRY_KEY, isDemoCode, isDemoEmail, shiftDay, shiftIso, shouldShiftBack, timeTravelBlocked, type DemoRegistry } from "./shared";

// GHI / XÓA DỮ LIỆU MẪU và TUA NHANH. Chỉ gọi từ app/actions/demo.ts (đã kiểm tra là admin).
// Xóa chỉ xóa đúng những gì có đủ dấu hiệu mẫu (sổ ghi + mã lớp MAU- + email @demo.fmood.invalid).

type Db = ReturnType<typeof createAdminClient>;
type Row = Record<string, unknown>;
export type DemoResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function readRegistry(db: Db): Promise<DemoRegistry | null> {
  const { data } = await db.from("app_settings").select("value").eq("key", DEMO_REGISTRY_KEY).maybeSingle();
  return (data?.value as DemoRegistry | undefined) ?? null;
}

async function writeRegistry(db: Db, registry: DemoRegistry) {
  const { error } = await db
    .from("app_settings")
    .upsert({ key: DEMO_REGISTRY_KEY, value: registry, updated_by_name: registry.createdBy, updated_at: new Date().toISOString() });
  if (error) throw error;
}

async function inBatches<T>(items: T[], size: number, run: (item: T) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(run));
}

async function insertAll(db: Db, table: string, rows: Row[]) {
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    // cột thiếu ở một số dòng (vd. tin nhắn không bị gắn cờ) lấy giá trị mặc định của bảng, không phải null
    let { error } = await db.from(table).insert(chunk, { defaultToNull: false });
    // cơ sở dữ liệu chưa chạy migration 0013: bỏ cột / loại hoạt động mới, vẫn tạo được phần còn lại
    if (error?.code === "42703" && table === "alerts") {
      ({ error } = await db.from(table).insert(chunk.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== "first_handled_at"))), { defaultToNull: false }));
    }
    if (error?.code === "23514" && table === "support_activity") {
      ({ error } = await db.from(table).insert(chunk.filter((r) => !String(r.kind).startsWith("topic_guess")), { defaultToNull: false }));
    }
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

export type DemoSummary = { classes: number; students: number; staff: number; checkins: number; worries: number; alerts: number };

const summarize = (d: DemoData): DemoSummary => ({
  classes: d.classes.length,
  students: d.students.length,
  staff: d.staff.length,
  checkins: d.checkins.length,
  worries: d.worries.length,
  alerts: d.alerts.length,
});

/** Tạo dữ liệu mẫu (khoảng 10–20 giây). Lỗi giữa chừng thì tự xóa phần đã tạo. */
export async function createDemoData(actorName: string): Promise<DemoResult<{ summary: DemoSummary }>> {
  const db = createAdminClient();
  if (await readRegistry(db)) return { ok: false, error: "Đã có dữ liệu mẫu. Xóa trước, hoặc bấm Tạo lại." };

  const [{ data: plants }, { data: actions }] = await Promise.all([
    db.from("garden_plants").select("id").eq("active", true).order("sort_order"),
    db.from("support_content").select("key, topic").eq("kind", "tiny_action").in("status", ["test", "on"]),
  ]);
  const byTopic: Record<string, string[]> = {};
  for (const a of actions ?? []) if (a.topic) (byTopic[a.topic as string] ??= []).push(a.key as string);
  const data = buildDemo({ now: new Date(), newId: randomUUID, plantIds: (plants ?? []).map((p) => p.id as string), actions: byTopic });

  const registry: DemoRegistry = {
    status: "creating",
    createdAt: new Date().toISOString(),
    createdBy: actorName,
    classIds: data.classes.map((c) => c.id),
    staffIds: data.staff.map((s) => s.id),
    studentIds: data.students.map((s) => s.id),
    showcase: data.showcase,
  };
  // ghi sổ TRƯỚC khi tạo gì, để lỗi giữa chừng vẫn xóa được
  await writeRegistry(db, registry);

  try {
    const people = [...data.staff, ...data.students];
    await inBatches(people, 8, async (p) => {
      const { error } = await db.auth.admin.createUser({
        id: p.id,
        email: demoEmail(p.id),
        // mật khẩu ngẫu nhiên, không lưu ở đâu: không ai đăng nhập được bằng tài khoản mẫu
        password: randomBytes(24).toString("base64url"),
        email_confirm: true,
        app_metadata: { demo: true },
      });
      if (error) throw new Error(`Tạo tài khoản mẫu lỗi: ${error.message}`);
    });

    await insertAll(
      db,
      "classes",
      data.classes.map((c) => ({ id: c.id, code: c.code, name: c.name, grade: c.grade, is_test: true })),
    );
    const onboarded = data.students[0]?.created_at;
    await insertAll(db, "profiles", [
      ...data.staff.map((s) => ({ id: s.id, nickname: s.nickname, role: s.role, class_id: null, email: null, onboarded_at: onboarded })),
      ...data.students.map((s) => ({
        id: s.id,
        class_id: s.class_id,
        nickname: s.nickname,
        full_name: s.full_name,
        role: "student",
        created_at: s.created_at,
        onboarded_at: s.created_at,
        garden_plant_id: s.garden_plant_id,
      })),
    ]);
    for (const c of data.classes) {
      const { error } = await db.from("classes").update({ homeroom_teacher_id: c.homeroom_teacher_id }).eq("id", c.id);
      if (error) throw error;
    }
    for (const table of [
      "checkins",
      "conversations",
      "messages",
      "message_feedback",
      "worries",
      "worry_checks",
      "support_activity",
      "badges_earned",
      "challenges",
      "habits",
      "habit_logs",
      "reflection_answers",
      "garden_harvests",
      "alerts",
      "help_requests",
      "surveys",
      "survey_responses",
      "lessons",
      "admin_audit",
    ] as const) {
      await insertAll(db, table, data[table]);
    }
    await writeRegistry(db, { ...registry, status: "ready" });
    return { ok: true, summary: summarize(data) };
  } catch (error) {
    console.error("[F-Mood] Tạo dữ liệu mẫu lỗi", error);
    await deleteDemoData();
    return { ok: false, error: `Chưa tạo được dữ liệu mẫu (${error instanceof Error ? error.message.slice(0, 160) : "lỗi"}). Đã dọn phần tạo dở.` };
  }
}

/** Xóa toàn bộ dữ liệu mẫu. Chỉ xóa lớp có mã MAU- và tài khoản có email @demo.fmood.invalid nằm trong sổ ghi. */
export async function deleteDemoData(): Promise<DemoResult<{ users: number; classes: number }>> {
  const db = createAdminClient();
  const registry = await readRegistry(db);
  if (!registry) return { ok: true, users: 0, classes: 0 };

  const { data: classRows } = registry.classIds.length ? await db.from("classes").select("id, code").in("id", registry.classIds) : { data: [] };
  const classIds = (classRows ?? []).filter((c) => isDemoCode(c.code as string)).map((c) => c.id as string);

  // chỉ tài khoản có email mẫu (kiểm tra từng người với hệ thống đăng nhập)
  const people = [...registry.staffIds, ...registry.studentIds];
  const users: string[] = [];
  await inBatches(people, 10, async (id) => {
    const { data } = await db.auth.admin.getUserById(id);
    if (data.user && isDemoEmail(data.user.email)) users.push(id);
  });

  // những dòng không tự mất theo tài khoản / lớp (vì giữ lại cho hồ sơ an toàn): xóa trước
  if (classIds.length) {
    await db.from("alerts").delete().in("class_id", classIds);
    await db.from("help_requests").delete().in("class_id", classIds);
    await db.from("survey_responses").delete().in("class_id", classIds);
  }
  if (users.length) {
    for (let i = 0; i < users.length; i += 80) {
      const ids = users.slice(i, i + 80);
      await db.from("alerts").delete().in("student_id", ids);
      await db.from("survey_responses").delete().in("user_id", ids);
      await db.from("surveys").delete().in("author_id", ids);
      await db.from("admin_audit").delete().in("actor_id", ids);
    }
  }
  let failed = 0;
  await inBatches(users, 8, async (id) => {
    const { error } = await db.auth.admin.deleteUser(id);
    if (error) failed++;
  });
  if (classIds.length) await db.from("classes").delete().in("id", classIds);
  if (failed) return { ok: false, error: `Còn ${failed} tài khoản mẫu chưa xóa được. Bấm Xóa lần nữa.` };
  await db.from("app_settings").delete().eq("key", DEMO_REGISTRY_KEY);
  return { ok: true, users: users.length, classes: classIds.length };
}

// ───────── Tua nhanh ─────────

/** Bảng có mốc thời gian của một học sinh: cột lọc, cột thời gian, cột ngày, khóa để ghi lại. */
const SHIFT_TABLES: { table: string; by: string; times: string[]; days?: string[]; key: string; replace?: boolean }[] = [
  { table: "checkins", by: "user_id", times: ["created_at"], key: "id" },
  { table: "conversations", by: "user_id", times: ["created_at", "updated_at"], key: "id" },
  { table: "worries", by: "user_id", times: ["created_at", "updated_at", "next_check_at"], key: "id" },
  { table: "worry_checks", by: "user_id", times: ["created_at"], key: "id" },
  { table: "support_activity", by: "user_id", times: ["created_at"], days: ["day"], key: "id" },
  { table: "badges_earned", by: "user_id", times: ["earned_at"], key: "user_id,badge_key" },
  { table: "habits", by: "user_id", times: ["created_at"], key: "id" },
  { table: "reflection_answers", by: "user_id", times: ["created_at"], days: ["day"], key: "id", replace: true },
  { table: "garden_harvests", by: "user_id", times: ["created_at"], key: "id" },
  { table: "message_feedback", by: "user_id", times: ["created_at", "updated_at"], key: "message_id" },
  { table: "alerts", by: "student_id", times: ["created_at", "handled_at", "first_handled_at"], key: "id" },
  { table: "help_requests", by: "student_id", times: ["created_at", "replied_at"], key: "id" },
  { table: "survey_responses", by: "user_id", times: ["created_at"], key: "id" },
];

function shiftRows(rows: Row[], times: string[], days: string[], by: number, at: string | null): Row[] {
  return rows
    .filter((r) => {
      if (!at) return true;
      const t = (r[times[0]] as string | null) ?? (r.created_at as string | null);
      return t ? shouldShiftBack(t, at) : false;
    })
    .map((r) => {
      const next = { ...r };
      for (const c of times) if (c in next) next[c] = shiftIso(next[c] as string | null, by);
      for (const c of days) if (next[c]) next[c] = shiftDay(next[c] as string, by);
      return next;
    });
}

/**
 * Tua nhanh: dời mọi mốc thời gian của bạn ấy lùi `days` ngày (như thể `days` ngày đã trôi qua).
 * Hoàn tác (`undoAt`): dời tới lại, chỉ những dòng có trước lúc tua.
 * Chỉ chạy với học sinh mẫu đủ 3 dấu hiệu; thiếu một là từ chối (shared.ts: timeTravelBlocked).
 */
export async function timeTravel(studentId: string, days: number, undoAt: string | null = null): Promise<DemoResult<{ at: string; rows: number }>> {
  const db = createAdminClient();
  const [registry, { data: profile }, { data: auth }] = await Promise.all([
    readRegistry(db),
    db.from("profiles").select("id, role, class_id, created_at, onboarded_at, classes!profiles_class_id_fkey(code)").eq("id", studentId).maybeSingle(),
    db.auth.admin.getUserById(studentId),
  ]);
  const blocked = timeTravelBlocked(registry, {
    id: studentId,
    role: (profile?.role as string) ?? "",
    classId: (profile?.class_id as string | null) ?? null,
    classCode: (profile?.classes as unknown as { code: string } | null)?.code ?? null,
    email: auth?.user?.email ?? null,
  });
  if (blocked || !profile) return { ok: false, error: blocked ?? "Không tìm thấy bạn này." };

  const at = new Date().toISOString();
  const by = undoAt ? days : -days;
  let count = 0;
  for (const t of SHIFT_TABLES) {
    const { data, error } = await db.from(t.table).select("*").eq(t.by, studentId);
    if (error) continue; // bảng chưa có (migration cũ)
    const moved = shiftRows(data ?? [], t.times, t.days ?? [], by, undoAt);
    if (!moved.length) continue;
    if (t.replace) {
      // khóa duy nhất theo ngày: xóa rồi ghi lại để không đụng nhau giữa chừng
      await db.from(t.table).delete().in(t.key, moved.map((r) => r[t.key] as string));
      await db.from(t.table).upsert(moved, { onConflict: "user_id,day", ignoreDuplicates: true });
    } else {
      const { error: e2 } = await db.from(t.table).upsert(moved, { onConflict: t.key });
      if (e2) return { ok: false, error: `Chưa tua được (${t.table}).` };
    }
    count += moved.length;
  }

  // tin nhắn (theo cuộc trò chuyện) và dấu tick thói quen (theo thói quen)
  const [{ data: convs }, { data: habits }] = await Promise.all([
    db.from("conversations").select("id").eq("user_id", studentId),
    db.from("habits").select("id").eq("user_id", studentId),
  ]);
  const convIds = (convs ?? []).map((c) => c.id as string);
  if (convIds.length) {
    const { data: msgs } = await db.from("messages").select("*").in("conversation_id", convIds);
    const moved = shiftRows(msgs ?? [], ["created_at"], [], by, undoAt);
    if (moved.length) await db.from("messages").upsert(moved, { onConflict: "id" });
    count += moved.length;
  }
  const habitIds = (habits ?? []).map((h) => h.id as string);
  if (habitIds.length) {
    const { data: logs } = await db.from("habit_logs").select("*").in("habit_id", habitIds);
    const eligible = (logs ?? []).filter((l) => !undoAt || shouldShiftBack(l.created_at as string, undoAt));
    if (eligible.length) {
      for (const h of habitIds) {
        const old = eligible.filter((l) => l.habit_id === h).map((l) => l.day as string);
        if (old.length) await db.from("habit_logs").delete().eq("habit_id", h).in("day", old);
      }
      await db.from("habit_logs").upsert(shiftRows(eligible, ["created_at"], ["day"], by, null), { onConflict: "habit_id,day", ignoreDuplicates: true });
      count += eligible.length;
    }
  }
  const [p] = shiftRows([profile as Row], ["created_at", "onboarded_at"], [], by, undoAt);
  if (p) await db.from("profiles").update({ created_at: p.created_at, onboarded_at: p.onboarded_at }).eq("id", studentId);
  return { ok: true, at, rows: count };
}
