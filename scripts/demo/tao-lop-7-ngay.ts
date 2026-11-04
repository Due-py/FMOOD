// Thêm LỚP MẪU "7 NGÀY" (20 bạn đã dùng Demo 2.1 từ 7 ngày trước) vào dữ liệu mẫu của chế độ trình diễn.
// Khác 3 lớp mẫu 30 ngày: 20 bạn này ĐĂNG NHẬP ĐƯỢC bằng mã lớp + biệt danh + mật khẩu chung (DEMO_HS_PASSWORD trong .env.local),
// để trình diễn phía học sinh có sẵn dữ liệu. Dữ liệu tạo ở lib/demo/week.ts (có test).
//
// Dùng:  npx tsx scripts/demo/tao-lop-7-ngay.ts          xem trước, chưa ghi gì
//        npx tsx scripts/demo/tao-lop-7-ngay.ts --ghi    tạo thật (cần đã có dữ liệu mẫu: Trình diễn → Tạo dữ liệu mẫu)
//        npx tsx scripts/demo/tao-lop-7-ngay.ts --xoa    xóa riêng lớp này (nút "Xóa dữ liệu mẫu" cũng xóa luôn lớp này)
import { randomBytes, randomUUID } from "node:crypto";
import { appendFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { buildWeek, type WeekData } from "../../lib/demo/week";
import { DEMO_REGISTRY_KEY, demoEmail, isDemoCode, isDemoEmail, type DemoRegistry } from "../../lib/demo/shared";
import { need } from "../_env";

const db = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SECRET_KEY"), { auth: { persistSession: false } });
type Row = Record<string, unknown>;

async function readRegistry(): Promise<DemoRegistry | null> {
  const { data } = await db.from("app_settings").select("value").eq("key", DEMO_REGISTRY_KEY).maybeSingle();
  return (data?.value as DemoRegistry | undefined) ?? null;
}
async function writeRegistry(registry: DemoRegistry) {
  const { error } = await db.from("app_settings").upsert({ key: DEMO_REGISTRY_KEY, value: registry, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Ghi sổ dữ liệu mẫu lỗi: ${error.message}`);
}
async function insertAll(table: string, rows: Row[]) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db.from(table).insert(rows.slice(i, i + 500), { defaultToNull: false });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}
async function inBatches<T>(items: T[], size: number, run: (item: T) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(run));
}

/** Xóa lớp 7 ngày: chỉ lớp có mã MAU- nằm trong loginClassIds và tài khoản có email mẫu trong lớp đó. */
async function removeWeek(registry: DemoRegistry): Promise<number> {
  const classIds = registry.loginClassIds ?? [];
  if (!classIds.length) return 0;
  const { data: classes } = await db.from("classes").select("id, code, homeroom_teacher_id").in("id", classIds);
  const ok = (classes ?? []).filter((c) => isDemoCode(c.code as string));
  const okIds = ok.map((c) => c.id as string);
  const { data: people } = okIds.length ? await db.from("profiles").select("id").in("class_id", okIds) : { data: [] };
  const candidates = [...(people ?? []).map((p) => p.id as string), ...ok.map((c) => c.homeroom_teacher_id as string).filter(Boolean)];
  const users: string[] = [];
  await inBatches(candidates, 10, async (id) => {
    const { data } = await db.auth.admin.getUserById(id);
    if (data.user && isDemoEmail(data.user.email)) users.push(id);
  });
  if (okIds.length) {
    await db.from("alerts").delete().in("class_id", okIds);
    await db.from("help_requests").delete().in("class_id", okIds);
  }
  if (users.length) await db.from("admin_audit").delete().in("actor_id", users);
  await inBatches(users, 8, (id) => db.auth.admin.deleteUser(id));
  if (okIds.length) await db.from("classes").delete().in("id", okIds);
  const gone = new Set([...users, ...okIds]);
  await writeRegistry({
    ...registry,
    classIds: registry.classIds.filter((id) => !gone.has(id)),
    staffIds: registry.staffIds.filter((id) => !gone.has(id)),
    studentIds: registry.studentIds.filter((id) => !gone.has(id)),
    loginClassIds: [],
  });
  return users.length;
}

function summary(d: WeekData) {
  console.log(`Lớp ${d.classRow.name} · mã ${d.classRow.code} · GVCN ${d.teacher.nickname}`);
  for (const [k, v] of Object.entries(d)) if (Array.isArray(v) && k !== "students") console.log(`  ${k.padEnd(22)} ${v.length}`);
  console.log("\nTài khoản (mã lớp + biệt danh + mật khẩu chung DEMO_HS_PASSWORD):");
  for (const s of d.students) {
    const done = d.practice_sessions.filter((p) => p.user_id === s.id && p.state === "completed").length;
    const all = d.practice_sessions.filter((p) => p.user_id === s.id).length;
    console.log(`  ${s.nickname.padEnd(12)} ${s.story.padEnd(9)} ${d.checkins.filter((c) => c.user_id === s.id).length} lần ghi tâm trạng · ${all} bài luyện (${done} xong) · nhân vật ${s.chat_style?.character ?? "soc"}`);
  }
}

async function main() {
  const write = process.argv.includes("--ghi");
  const remove = process.argv.includes("--xoa");
  const registry = await readRegistry();
  if (!registry || registry.status !== "ready") {
    console.error("Chưa có dữ liệu mẫu. Vào Trình diễn → Tạo dữ liệu mẫu trước, rồi chạy lại.");
    process.exit(1);
  }
  if (remove) {
    console.log(`Đã xóa lớp 7 ngày (${await removeWeek(registry)} tài khoản).`);
    return;
  }
  if (registry.loginClassIds?.length) {
    console.error("Đã có lớp mẫu 7 ngày. Chạy với --xoa trước nếu muốn tạo lại.");
    process.exit(1);
  }

  const [{ data: plants }, { data: actions }, { data: lessons }, { data: counselor }] = await Promise.all([
    db.from("garden_plants").select("id").eq("active", true).order("sort_order"),
    db.from("support_content").select("key, topic, data").eq("kind", "tiny_action").in("status", ["test", "on"]),
    db.from("lessons").select("slug").eq("published", true).is("class_id", null),
    db.from("profiles").select("id, nickname").eq("id", registry.showcase.counselor).maybeSingle(),
  ]);
  if (!counselor) throw new Error("Không thấy tư vấn viên mẫu trong dữ liệu mẫu.");
  const data = buildWeek({
    now: new Date(),
    newId: randomUUID,
    plantIds: (plants ?? []).map((p) => p.id as string),
    actions: (actions ?? []).map((a) => ({ key: a.key as string, topic: (a.topic as string | null) ?? null, code: ((a.data as Row)?.code as string | undefined) ?? null })),
    lessons: (lessons ?? []).map((l) => l.slug as string),
    counselorId: counselor.id as string,
    counselorName: counselor.nickname as string,
  });
  summary(data);
  if (!write) {
    console.log("\nChưa ghi gì. Thêm --ghi để tạo thật.");
    return;
  }

  let password = process.env.DEMO_HS_PASSWORD;
  if (!password) {
    password = `fmood-${randomBytes(4).toString("hex")}`;
    appendFileSync(".env.local", `\n# Mật khẩu chung của 20 tài khoản lớp mẫu 7 ngày (scripts/demo/tao-lop-7-ngay.ts)\nDEMO_HS_PASSWORD=${password}\n`);
    console.log("\nĐã ghi mật khẩu chung mới vào .env.local (DEMO_HS_PASSWORD).");
  }

  // ghi sổ TRƯỚC khi tạo gì, để lỗi giữa chừng vẫn xóa được (bằng --xoa hoặc nút Xóa dữ liệu mẫu)
  const next: DemoRegistry = {
    ...registry,
    classIds: [...registry.classIds, data.classRow.id],
    staffIds: [...registry.staffIds, data.teacher.id],
    studentIds: [...registry.studentIds, ...data.students.map((s) => s.id)],
    loginClassIds: [data.classRow.id],
  };
  await writeRegistry(next);

  try {
    const { error: te } = await db.auth.admin.createUser({
      id: data.teacher.id,
      email: demoEmail(data.teacher.id),
      // GVCN mẫu: mật khẩu ngẫu nhiên, không ai đăng nhập
      password: randomBytes(24).toString("base64url"),
      email_confirm: true,
      app_metadata: { demo: true },
    });
    if (te) throw new Error(`Tạo GVCN mẫu lỗi: ${te.message}`);
    await inBatches(data.students, 8, async (s) => {
      const { error } = await db.auth.admin.createUser({
        id: s.id,
        email: demoEmail(s.id),
        password,
        email_confirm: true,
        app_metadata: { demo: true },
        user_metadata: { nickname: s.nickname },
      });
      if (error) throw new Error(`Tạo tài khoản ${s.nickname} lỗi: ${error.message}`);
    });

    const c = data.classRow;
    await insertAll("classes", [{ id: c.id, code: c.code, name: c.name, grade: c.grade, is_test: true }]);
    await insertAll("profiles", [
      { id: data.teacher.id, nickname: data.teacher.nickname, role: "teacher", class_id: null, email: null, onboarded_at: data.students[0].created_at },
      ...data.students.map((s) => ({
        id: s.id,
        class_id: c.id,
        nickname: s.nickname,
        full_name: s.full_name,
        role: "student",
        created_at: s.created_at,
        onboarded_at: s.created_at,
        garden_plant_id: s.garden_plant_id,
        chat_style: s.chat_style,
      })),
    ]);
    const { error: he } = await db.from("classes").update({ homeroom_teacher_id: data.teacher.id }).eq("id", c.id);
    if (he) throw he;
    for (const table of [
      "checkins",
      "conversations",
      "messages",
      "message_feedback",
      "worries",
      "worry_checks",
      "support_activity",
      "badges_earned",
      "habits",
      "habit_logs",
      "reflection_answers",
      "help_requests",
      "practice_sessions",
      "practice_attempts",
      "content_opens",
      "admin_audit",
    ] as const) {
      await insertAll(table, data[table]);
      process.stdout.write(".");
    }
    console.log(`\nXong. Đăng nhập học sinh: mã lớp ${c.code} + biệt danh (ở trên) + mật khẩu DEMO_HS_PASSWORD trong .env.local.`);
  } catch (error) {
    console.error("\nTạo lỗi, đang dọn phần đã tạo…", error instanceof Error ? error.message : error);
    await removeWeek(next);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
