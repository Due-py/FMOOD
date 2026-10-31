import "server-only";
import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabasePublishableKey, supabaseUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { demoRegistry } from "./server";
import { demoEmail, isDemoEmail } from "./shared";

// CHỨNG MINH TRỰC TIẾP: HỌC SINH A KHÔNG XEM / SỬA ĐƯỢC DỮ LIỆU CỦA HỌC SINH B
// (bản chạy trong trang Trình diễn của scripts/kiem-tra-tach-du-lieu.ts, dùng 2 bạn MẪU có sẵn).
// Máy chủ đặt cho bạn A một mật khẩu ngẫu nhiên, đăng nhập như một học sinh thật, rồi dùng đúng khóa
// công khai mà trình duyệt có để gọi THẲNG cơ sở dữ liệu (bỏ qua giao diện app). Xong thì đổi mật khẩu
// ngẫu nhiên khác. Không ghi gì vào dữ liệu của B (mọi lần thử ghi đều bị chặn và được kiểm tra lại).

export type ProofRow = { group: string; attempt: string; blocked: boolean; detail: string };
export type ProofResult =
  | {
      ok: true;
      a: string;
      b: string;
      control: { ownProfile: number; ownCheckins: number; bMessages: number; bCheckins: number; bWorries: number };
      rows: ProofRow[];
      ms: number;
    }
  | { ok: false; error: string };

type Q = PromiseLike<{ data: unknown[] | null; error: unknown }>;

export async function runPrivacyProof(): Promise<ProofResult> {
  const started = Date.now();
  const registry = await demoRegistry();
  if (!registry) return { ok: false, error: "Chưa có dữ liệu mẫu. Tạo dữ liệu mẫu trước nhé." };
  const { a, b } = registry.showcase;
  const admin = createAdminClient();
  const [{ data: authA }, { data: authB }, { data: people }] = await Promise.all([
    admin.auth.admin.getUserById(a),
    admin.auth.admin.getUserById(b),
    admin.from("profiles").select("id, nickname, class_id").in("id", [a, b]),
  ]);
  // chỉ chạy với 2 tài khoản mẫu
  if (!isDemoEmail(authA.user?.email) || !isDemoEmail(authB.user?.email) || (people ?? []).length !== 2) {
    return { ok: false, error: "Không tìm thấy 2 bạn mẫu. Bấm Tạo lại dữ liệu mẫu nhé." };
  }
  const name = (id: string) => (people ?? []).find((p) => p.id === id)?.nickname as string;

  const rows: ProofRow[] = [];
  const record = (group: string, attempt: string, blocked: boolean, detail: string) => rows.push({ group, attempt, blocked, detail });
  const tryRead = async (group: string, attempt: string, query: Q) => {
    const { data, error } = await query;
    const n = data?.length ?? 0;
    record(group, attempt, n === 0, error ? "bị từ chối" : `thấy ${n} dòng`);
  };
  const tryWrite = async (group: string, attempt: string, query: Q, intact: () => Promise<boolean>) => {
    const { data, error } = await query;
    const ok = await intact();
    record(group, attempt, ok && (Boolean(error) || (data?.length ?? 0) === 0), error ? "bị từ chối" : ok ? "không đổi được dòng nào" : "DỮ LIỆU ĐÃ BỊ ĐỔI");
  };
  const count = async (table: string, col: string, val: string) =>
    (await admin.from(table).select("*", { count: "exact", head: true }).eq(col, val)).count ?? 0;

  // dữ liệu thật của B để thử (lấy bằng quyền máy chủ)
  const [{ data: convB }, { data: worryB }] = await Promise.all([
    admin.from("conversations").select("id").eq("user_id", b).limit(1).maybeSingle(),
    admin.from("worries").select("id, level_now").eq("user_id", b).limit(1).maybeSingle(),
  ]);
  const convId = (convB?.id as string | undefined) ?? "00000000-0000-0000-0000-000000000000";

  const password = randomBytes(24).toString("base64url");
  await admin.auth.admin.updateUserById(a, { password });
  const asA: SupabaseClient = createClient(supabaseUrl(), supabasePublishableKey(), { auth: { persistSession: false, autoRefreshToken: false } });
  const anon: SupabaseClient = createClient(supabaseUrl(), supabasePublishableKey(), { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const { error: loginError } = await asA.auth.signInWithPassword({ email: demoEmail(a), password });
    if (loginError) return { ok: false, error: "Chưa đăng nhập được bằng bạn A." };

    // Đối chứng: A thấy được dữ liệu của CHÍNH MÌNH, và B thật sự có dữ liệu. Nếu không, "thấy 0 dòng" chẳng chứng minh gì.
    const control = {
      ownProfile: (await asA.from("profiles").select("id").eq("id", a)).data?.length ?? 0,
      ownCheckins: (await asA.from("checkins").select("id").eq("user_id", a)).data?.length ?? 0,
      bMessages: convB ? await count("messages", "conversation_id", convId) : 0,
      bCheckins: await count("checkins", "user_id", b),
      bWorries: await count("worries", "user_id", b),
    };
    if (control.ownProfile !== 1 || control.bCheckins === 0) return { ok: false, error: "Đối chứng chưa đạt nên kết quả không đáng tin, dừng lại." };

    const R = `${name(a)} cố XEM dữ liệu của ${name(b)}`;
    await tryRead(R, "Hồ sơ của B (họ tên thật)", asA.from("profiles").select("id, full_name").eq("id", b));
    await tryRead(R, "Danh sách cuộc trò chuyện của B", asA.from("conversations").select("id, title").eq("user_id", b));
    await tryRead(R, "Tin nhắn của B (biết sẵn mã cuộc trò chuyện)", asA.from("messages").select("content").eq("conversation_id", convId));
    await tryRead(R, "Mọi tin nhắn không phải của mình", asA.from("messages").select("content").neq("conversation_id", "00000000-0000-0000-0000-000000000000").not("conversation_id", "in", `(${(await ownConversations(asA, a)).join(",") || "00000000-0000-0000-0000-000000000000"})`));
    await tryRead(R, "Check-in cảm xúc của B", asA.from("checkins").select("emotions").eq("user_id", b));
    await tryRead(R, "Chuyện bận lòng của B", asA.from("worries").select("topic, note").eq("user_id", b));
    await tryRead(R, "Các lần trợ lý hỏi lại B", asA.from("worry_checks").select("level").eq("user_id", b));
    await tryRead(R, "Thói quen của B", asA.from("habits").select("title").eq("user_id", b));
    await tryRead(R, "Câu trả lời suy ngẫm của B", asA.from("reflection_answers").select("answer").eq("user_id", b));
    await tryRead(R, "Cảnh báo an toàn (của bất kỳ ai)", asA.from("alerts").select("excerpt").limit(5));
    await tryRead(R, "Lời nhờ thầy cô giúp (của bất kỳ ai)", asA.from("help_requests").select("note").limit(5));

    const W = `${name(a)} cố SỬA / XÓA dữ liệu của ${name(b)}`;
    const bNick = name(b);
    await tryWrite(W, "Đổi biệt danh của B", asA.from("profiles").update({ nickname: "bị đổi" }).eq("id", b).select(), async () =>
      (await admin.from("profiles").select("nickname").eq("id", b).single()).data?.nickname === bNick);
    const bCheckins = control.bCheckins;
    await tryWrite(W, "Tạo check-in giả đứng tên B", asA.from("checkins").insert({ user_id: b, emotions: ["buon"] }).select(), async () =>
      (await count("checkins", "user_id", b)) === bCheckins);
    await tryWrite(W, "Xóa cuộc trò chuyện của B", asA.from("conversations").delete().eq("id", convId).select(), async () =>
      !convB || (await count("conversations", "id", convId)) === 1);
    if (worryB) {
      await tryWrite(W, "Sửa mức lo trong chuyện bận lòng của B", asA.from("worries").update({ level_now: 1 }).eq("id", worryB.id).select(), async () =>
        (await admin.from("worries").select("level_now").eq("id", worryB.id).single()).data?.level_now === worryB.level_now);
    }
    await tryWrite(W, "Tự nâng mình lên làm admin", asA.from("profiles").update({ role: "admin" }).eq("id", a).select(), async () =>
      (await admin.from("profiles").select("role").eq("id", a).single()).data?.role === "student");
    const alertsBefore = await count("alerts", "student_id", b);
    await tryWrite(W, "Tạo cảnh báo giả về B", asA.from("alerts").insert({ student_id: b, nickname: "giả", type: "chat_risk", severity: "urgent" }).select(), async () =>
      (await count("alerts", "student_id", b)) === alertsBefore);

    const N = "Người CHƯA đăng nhập";
    await tryRead(N, "Đọc hồ sơ học sinh", anon.from("profiles").select("id").limit(5));
    await tryRead(N, "Đọc tin nhắn", anon.from("messages").select("content").limit(5));
    await tryRead(N, "Đọc danh sách lớp và mã lớp", anon.from("classes").select("code").limit(5));

    return { ok: true, a: name(a), b: name(b), control, rows, ms: Date.now() - started };
  } finally {
    await asA.auth.signOut().catch(() => {});
    // không ai giữ được mật khẩu vừa dùng
    await admin.auth.admin.updateUserById(a, { password: randomBytes(24).toString("base64url") });
  }
}

async function ownConversations(client: SupabaseClient, userId: string): Promise<string[]> {
  const { data } = await client.from("conversations").select("id").eq("user_id", userId);
  return (data ?? []).map((c) => c.id as string);
}
