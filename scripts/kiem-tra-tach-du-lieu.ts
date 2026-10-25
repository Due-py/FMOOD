// CHỨNG MINH: HỌC SINH NÀY KHÔNG XEM / SỬA ĐƯỢC DỮ LIỆU CỦA HỌC SINH KHÁC
// Dùng: npm run proof:isolation
//
// Cách làm (giống một bạn học sinh cố tình "hack"):
//  1. Tạo một lớp THỬ với 2 học sinh THỬ (A và B). Ghi cho B vài dữ liệu mẫu (tự đặt, vô hại).
//  2. Đăng nhập bằng A, dùng đúng khóa công khai mà trình duyệt có, gọi THẲNG cơ sở dữ liệu
//     (bỏ qua giao diện app) để đọc, sửa, xóa dữ liệu của B.
//  3. Mỗi lần thử phải bị chặn. In bảng kết quả và lưu ra ho-so-du-thi/3-kiem-thu/tach-du-lieu/.
//  4. Luôn xóa lớp và 2 tài khoản thử ở cuối, kể cả khi có lỗi.
//
// Không đụng tới dữ liệu của học sinh thật, không tạo cảnh báo, không gửi email.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { need } from "./_env";
import { studentEmail } from "@/lib/student-email";

const url = need("NEXT_PUBLIC_SUPABASE_URL");
const admin = createClient(url, need("SUPABASE_SECRET_KEY"), { auth: { persistSession: false } });
const publicKey = need("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

type Row = { group: string; attempt: string; blocked: boolean; detail: string };
const rows: Row[] = [];

function record(group: string, attempt: string, blocked: boolean, detail: string) {
  rows.push({ group, attempt, blocked, detail });
  console.log(`${blocked ? "CHẶN ĐƯỢC" : "LỌT !!!  "}  ${attempt}  (${detail})`);
}

/** Đọc: chặn được khi không thấy dòng nào của B. */
async function tryRead(group: string, attempt: string, query: PromiseLike<{ data: unknown[] | null; error: unknown }>) {
  const { data, error } = await query;
  const n = data?.length ?? 0;
  record(group, attempt, n === 0, error ? "bị từ chối" : `thấy ${n} dòng`);
}

/** Ghi: chặn được khi bị lỗi, hoặc không dòng nào bị đổi (kiểm tra lại bằng quyền quản trị). */
async function tryWrite(
  group: string,
  attempt: string,
  query: PromiseLike<{ data: unknown[] | null; error: unknown }>,
  stillIntact: () => Promise<boolean>,
) {
  const { data, error } = await query;
  const intact = await stillIntact();
  const blocked = intact && (Boolean(error) || (data?.length ?? 0) === 0);
  record(group, attempt, blocked, error ? "bị từ chối" : intact ? "không đổi được dòng nào" : "DỮ LIỆU CỦA B ĐÃ BỊ ĐỔI");
}

async function createStudent(classId: string, nickname: string) {
  const id = randomUUID();
  const password = randomBytes(18).toString("base64url");
  const { error } = await admin.auth.admin.createUser({ id, email: studentEmail(id), password, email_confirm: true });
  if (error) throw error;
  const { error: e2 } = await admin.from("profiles").insert({
    id,
    class_id: classId,
    nickname,
    full_name: `Học Sinh Thử ${nickname}`,
    role: "student",
    onboarded_at: new Date().toISOString(),
  });
  if (e2) throw e2;
  return { id, password };
}

async function main() {
  const code = `TK${randomBytes(4).toString("hex").toUpperCase()}`.slice(0, 10);
  let classId: string | null = null;
  const users: string[] = [];
  try {
    // ── 1. Chuẩn bị lớp và 2 học sinh thử ──
    const { data: cls, error } = await admin
      .from("classes")
      .insert({ code, name: "Lớp thử tách dữ liệu (tự xóa)", grade: 8 })
      .select("id")
      .single();
    if (error || !cls) throw error;
    classId = cls.id as string;
    const a = await createStudent(classId, "TEST A");
    users.push(a.id);
    const b = await createStudent(classId, "TEST B");
    users.push(b.id);

    // dữ liệu mẫu của B (câu vô hại, tự đặt)
    const { data: conv } = await admin.from("conversations").insert({ user_id: b.id, title: "Bí mật của B" }).select("id").single();
    const convId = conv!.id as string;
    await admin.from("messages").insert({ conversation_id: convId, role: "user", content: "Đây là tin nhắn riêng của B" });
    await admin.from("checkins").insert({ user_id: b.id, emotions: ["vui"] });
    const { data: habit } = await admin.from("habits").insert({ user_id: b.id, title: "Đọc sách" }).select("id").single();
    const habitId = habit!.id as string;
    await admin.from("habit_logs").insert({ habit_id: habitId, day: "2026-01-01" });
    await admin.from("reflection_answers").insert({ user_id: b.id, question_text: "Câu hỏi thử", day: "2026-01-01", answer: "Câu trả lời riêng của B" });

    const count = async (table: string, col: string, val: string) =>
      (await admin.from(table).select("*", { count: "exact", head: true }).eq(col, val)).count ?? 0;

    // ── 2. Đăng nhập bằng A ──
    const asA: SupabaseClient = createClient(url, publicKey, { auth: { persistSession: false } });
    const { error: loginError } = await asA.auth.signInWithPassword({ email: studentEmail(a.id), password: a.password });
    if (loginError) throw loginError;
    const anon: SupabaseClient = createClient(url, publicKey, { auth: { persistSession: false } });

    // Đối chứng: A phải thấy được hồ sơ của CHÍNH MÌNH, và dữ liệu của B phải thật sự tồn tại.
    // Nếu không, các dòng "thấy 0 dòng" bên dưới không chứng minh được gì.
    const own = await asA.from("profiles").select("id").eq("id", a.id);
    const bHas = await count("messages", "conversation_id", convId);
    if ((own.data?.length ?? 0) !== 1 || bHas !== 1) throw new Error("Đối chứng thất bại: kết quả không đáng tin, dừng lại.");
    console.log("Đối chứng: A thấy hồ sơ của chính mình (1 dòng); B có 1 tin nhắn riêng. Bắt đầu thử...");

    // ── 3. A cố đọc dữ liệu của B ──
    const R = "A cố XEM dữ liệu của B";
    await tryRead(R, "Hồ sơ của B (biệt danh, họ tên thật)", asA.from("profiles").select("id, full_name").eq("id", b.id));
    await tryRead(R, "Danh sách cuộc trò chuyện của B", asA.from("conversations").select("id, title").eq("user_id", b.id));
    await tryRead(R, "Tin nhắn trong cuộc trò chuyện của B (biết sẵn mã)", asA.from("messages").select("content").eq("conversation_id", convId));
    await tryRead(R, "Mọi tin nhắn trong hệ thống", asA.from("messages").select("content").neq("conversation_id", "00000000-0000-0000-0000-000000000000"));
    await tryRead(R, "Check-in cảm xúc của B", asA.from("checkins").select("emotions").eq("user_id", b.id));
    await tryRead(R, "Thói quen của B", asA.from("habits").select("title").eq("user_id", b.id));
    await tryRead(R, "Lịch đánh dấu thói quen của B", asA.from("habit_logs").select("day").eq("habit_id", habitId));
    await tryRead(R, "Câu trả lời suy ngẫm của B", asA.from("reflection_answers").select("answer").eq("user_id", b.id));
    await tryRead(R, "Câu trả lời bài tập của B", asA.from("lesson_responses").select("answer").eq("user_id", b.id));
    await tryRead(R, "Cảnh báo an toàn (của bất kỳ ai)", asA.from("alerts").select("excerpt").limit(5));
    await tryRead(R, "Ảnh đại diện riêng tư trong kho ảnh", asA.storage.from("avatars").list(b.id).then((r) => ({ data: r.data ?? [], error: r.error })));

    // ── 4. A cố sửa / xóa dữ liệu của B ──
    const W = "A cố SỬA / XÓA dữ liệu của B";
    await tryWrite(W, "Đổi biệt danh của B", asA.from("profiles").update({ nickname: "bị hack" }).eq("id", b.id).select(), async () =>
      (await admin.from("profiles").select("nickname").eq("id", b.id).single()).data?.nickname === "TEST B");
    await tryWrite(W, "Xóa cuộc trò chuyện của B", asA.from("conversations").delete().eq("id", convId).select(), async () =>
      (await count("conversations", "id", convId)) === 1);
    await tryWrite(W, "Chèn tin nhắn giả vào cuộc trò chuyện của B", asA.from("messages").insert({ conversation_id: convId, role: "assistant", content: "tin giả" }).select(), async () =>
      (await count("messages", "conversation_id", convId)) === 1);
    await tryWrite(W, "Tạo check-in giả đứng tên B", asA.from("checkins").insert({ user_id: b.id, emotions: ["buon"] }).select(), async () =>
      (await count("checkins", "user_id", b.id)) === 1);
    await tryWrite(W, "Xóa lịch thói quen của B", asA.from("habit_logs").delete().eq("habit_id", habitId).select(), async () =>
      (await count("habit_logs", "habit_id", habitId)) === 1);
    await tryWrite(W, "Xóa câu trả lời suy ngẫm của B", asA.from("reflection_answers").delete().eq("user_id", b.id).select(), async () =>
      (await count("reflection_answers", "user_id", b.id)) === 1);
    await tryWrite(W, "Tự nâng mình lên làm admin", asA.from("profiles").update({ role: "admin" }).eq("id", a.id).select(), async () =>
      (await admin.from("profiles").select("role").eq("id", a.id).single()).data?.role === "student");
    await tryWrite(W, "Tự gỡ cờ an toàn trên tin nhắn", asA.from("messages").update({ flagged: false }).eq("conversation_id", convId).select(), async () => true);

    // ── 5. Người chưa đăng nhập ──
    const N = "Người CHƯA đăng nhập";
    await tryRead(N, "Đọc hồ sơ học sinh", anon.from("profiles").select("id").limit(5));
    await tryRead(N, "Đọc tin nhắn", anon.from("messages").select("content").limit(5));
    await tryRead(N, "Đọc danh sách lớp và mã lớp", anon.from("classes").select("code").limit(5));
    await asA.auth.signOut();
  } finally {
    // ── 6. Dọn dẹp: xóa tài khoản thử (dữ liệu của họ bị xóa theo) và lớp thử ──
    for (const id of users) await admin.auth.admin.deleteUser(id);
    if (classId) await admin.from("classes").delete().eq("id", classId);
    const left = classId ? ((await admin.from("classes").select("id", { count: "exact", head: true }).eq("id", classId)).count ?? 0) : 0;
    console.log(`\nĐã xóa ${users.length} tài khoản thử và lớp thử ${code}${left ? " (LỚP CHƯA XÓA ĐƯỢC, xóa tay)" : ""}.`);
  }

  const leaks = rows.filter((r) => !r.blocked).length;
  console.log(leaks ? `\n${leaks}/${rows.length} lần thử LỌT dữ liệu!` : `\nChặn được cả ${rows.length}/${rows.length} lần thử.`);
  saveReport(leaks);
  process.exitCode = leaks ? 1 : 0;
}

function saveReport(leaks: number) {
  const now = new Date();
  const stamp = now.toISOString().slice(0, 10);
  const dir = path.join(process.cwd(), "ho-so-du-thi/3-kiem-thu/tach-du-lieu");
  mkdirSync(dir, { recursive: true });
  const time = now.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const lines = [
    `# Kiểm tra tách dữ liệu giữa các học sinh · ${time}`,
    ``,
    `Lệnh: \`npm run proof:isolation\` (scripts/kiem-tra-tach-du-lieu.ts). Học sinh thử A đăng nhập, rồi gọi THẲNG cơ sở dữ liệu`,
    `bằng khóa công khai của trình duyệt (bỏ qua giao diện app) để cố xem / sửa dữ liệu của học sinh thử B.`,
    `Lớp và 2 tài khoản thử được xóa ngay sau khi chạy. Không dùng dữ liệu của học sinh thật.`,
    `Đối chứng trước khi thử: A đọc được hồ sơ của chính mình, và B có dữ liệu thật trong cơ sở dữ liệu (nên "thấy 0 dòng" là do bị chặn, không phải do lỗi).`,
    ``,
    `**Kết quả: ${leaks ? `${leaks}/${rows.length} lần thử LỌT dữ liệu` : `chặn được ${rows.length}/${rows.length} lần thử`}.**`,
    ``,
    `| # | Nhóm | Lần thử | Kết quả | Chi tiết |`,
    `|---|------|---------|---------|----------|`,
    ...rows.map((r, i) => `| ${i + 1} | ${r.group} | ${r.attempt} | ${r.blocked ? "✅ Chặn được" : "❌ LỌT"} | ${r.detail} |`),
    ``,
    `Vì sao chặn được: mỗi bảng bật Row Level Security (RLS) của PostgreSQL, chỉ cho đọc dòng có \`user_id\` trùng người đang đăng nhập`,
    `(supabase/migrations/0001_init.sql và các file sau). Việc ghi tin nhắn, cờ an toàn, cảnh báo đi qua máy chủ, có kiểm tra quyền trong code.`,
  ];
  const file = path.join(dir, `${stamp}.md`);
  writeFileSync(file, lines.join("\n") + "\n", "utf8");
  console.log(`Đã lưu báo cáo: ${path.relative(process.cwd(), file)}`);
}

main().catch((error) => {
  console.error("Lỗi:", error);
  process.exitCode = 1;
});
