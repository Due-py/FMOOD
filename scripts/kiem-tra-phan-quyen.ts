// THỬ PHÂN QUYỀN Ở TRANG THẦY CÔ (sai lớp, sai vai trò). Các trang thầy cô đọc / ghi bằng khóa máy chủ (bỏ qua RLS),
// nên phạm vi lớp và vai trò được kiểm tra trong mã xử lý. Script này thử phá các kiểm tra đó TRÊN WEB ĐANG CHẠY:
//   1. Giáo viên chủ nhiệm lớp X cố xem dữ liệu lớp Y.
//   2. Giáo viên cố làm việc của phòng tham vấn (xử lý cảnh báo, đọc nội dung cảnh báo, trả lời lời nhờ gửi phòng tham vấn…).
//   3. Học sinh cố vào trang thầy cô và gọi thao tác của thầy cô.
//   4. Người chưa đăng nhập cố vào trang thầy cô.
// Trang được gọi bằng HTTP như trình duyệt; thao tác (server action) được gọi THẲNG bằng mã thao tác lấy từ bản build
// (bỏ qua giao diện, như người cố tình "hack"), rồi kiểm tra lại cơ sở dữ liệu xem có gì bị đổi không.
// Mỗi phép thử có ĐỐI CHỨNG: tài khoản đúng quyền phải làm được / thấy được, để "bị chặn" là do phân quyền chứ không do lỗi.
//
// Dùng: npm run build && npx next start -p 3100   rồi   npm run proof:roles -- http://localhost:3100
// Tạo lớp thử, giáo viên thử, học sinh thử, cảnh báo và lời nhờ thử (câu vô hại, có mã nhận diện); KHÔNG gửi email.
// Luôn xóa hết ở cuối, kể cả khi có lỗi. Kết quả lưu vào ho-so-du-thi/3-kiem-thu/phan-quyen/.
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { need } from "./_env";
import { studentEmail } from "@/lib/student-email";
import { stamp, versionCode } from "./eval/chung";

const BASE = (process.argv[2] ?? "http://localhost:3100").replace(/\/$/, "");
const url = need("NEXT_PUBLIC_SUPABASE_URL");
const admin = createClient(url, need("SUPABASE_SECRET_KEY"), { auth: { persistSession: false } });

type Row = { group: string; attempt: string; blocked: boolean; detail: string; control?: string };
const rows: Row[] = [];
function record(group: string, attempt: string, blocked: boolean, detail: string, control?: string) {
  rows.push({ group, attempt, blocked, detail, control });
  console.log(`${blocked ? "CHẶN ĐƯỢC" : "LỌT !!!  "}  ${attempt}  (${detail})`);
}

// ───────── mã thao tác (server action) từ bản build ─────────
type ManifestEntry = { workers: Record<string, unknown>; filename?: string; exportedName?: string };
const manifest = JSON.parse(readFileSync(path.join(process.cwd(), ".next/server/server-reference-manifest.json"), "utf8")) as {
  node: Record<string, ManifestEntry>;
};
function action(filename: string, name: string): { id: string; page: string } {
  const hit = Object.entries(manifest.node).find(([, e]) => e.filename === filename && e.exportedName === name);
  if (!hit) throw new Error(`Không thấy thao tác ${filename}#${name} trong bản build. Chạy npm run build trước.`);
  // trang có dùng thao tác này: app/staff/(portal)/loi-nho/page → /staff/loi-nho
  const worker = Object.keys(hit[1].workers)[0];
  const page = worker.replace(/^app/, "").replace(/\/page$/, "").replace(/\/\([^)]+\)/g, "") || "/";
  return { id: hit[0], page };
}

// ───────── đăng nhập, gọi trang, gọi thao tác ─────────
async function cookieFor(email: string, password: string): Promise<string> {
  const jar = new Map<string, string>();
  const sb = createServerClient(url, need("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function page(cookie: string | null, pathname: string) {
  const res = await fetch(`${BASE}${pathname}`, { headers: cookie ? { cookie } : {}, redirect: "manual" });
  const body = res.status === 200 ? await res.text() : "";
  return { status: res.status, location: res.headers.get("location") ?? "", body };
}

async function callAction(cookie: string, a: { id: string; page: string }, args: unknown[]) {
  const res = await fetch(`${BASE}${a.page}`, {
    method: "POST",
    redirect: "manual",
    headers: {
      cookie,
      "Next-Action": a.id,
      Accept: "text/x-component",
      "Content-Type": "text/plain;charset=UTF-8",
      Origin: BASE,
    },
    body: JSON.stringify(args),
  });
  return { status: res.status, text: (await res.text()).slice(0, 4000), redirect: res.headers.get("x-action-redirect") ?? res.headers.get("location") ?? "" };
}

const blockedPage = (p: { status: number; location: string }) => p.status !== 200;

async function main() {
  const tag = randomBytes(3).toString("hex").toUpperCase();
  const mark = (s: string) => `PQ-${s}-${tag}`;
  const made = { classes: [] as string[], users: [] as string[], alerts: [] as string[], help: [] as string[] };
  const pw = () => randomBytes(18).toString("base64url");
  let actionControl = false;

  async function user(role: "student" | "teacher" | "counselor", nickname: string, classId: string | null) {
    const id = randomUUID();
    const password = pw();
    const email = role === "student" ? studentEmail(id) : `pq-${role}-${tag.toLowerCase()}-${made.users.length}@fmood.invalid`;
    const { error } = await admin.auth.admin.createUser({ id, email, password, email_confirm: true });
    if (error) throw error;
    made.users.push(id);
    const { error: e2 } = await admin.from("profiles").insert({
      id,
      class_id: role === "student" ? classId : null,
      nickname,
      full_name: `${nickname} ${tag}`,
      role,
      email: role === "student" ? null : email,
      onboarded_at: new Date().toISOString(),
    });
    if (e2) throw e2;
    return { id, email, password, nickname };
  }

  try {
    // ── chuẩn bị: 2 lớp thử, GVCN lớp X, tư vấn viên (đối chứng), học sinh ở X và Y ──
    for (const k of ["X", "Y"]) {
      const { data, error } = await admin
        .from("classes")
        .insert({ code: `PQ${k}${tag}`, name: `Lớp thử phân quyền ${k} ${tag} (tự xóa)`, grade: 8, is_test: true })
        .select("id")
        .single();
      if (error || !data) throw error;
      made.classes.push(data.id as string);
    }
    const [classX, classY] = made.classes;
    const teacher = await user("teacher", "GV THỬ X", null);
    await admin.from("classes").update({ homeroom_teacher_id: teacher.id }).eq("id", classX);
    const counselor = await user("counselor", "TƯ VẤN THỬ", null);
    const sx = await user("student", `HS THỬ X ${tag}`, classX);
    const sy = await user("student", `HS THỬ Y ${tag}`, classY);

    const alert = async (s: { id: string; nickname: string }, classId: string, m: string) => {
      const { data, error } = await admin
        .from("alerts")
        .insert({ student_id: s.id, class_id: classId, nickname: s.nickname, full_name: null, type: "chat_risk", severity: "watch", excerpt: `Câu thử phân quyền ${m}`, reasons: [`Lý do thử ${m}`] })
        .select("id")
        .single();
      if (error || !data) throw error;
      made.alerts.push(data.id as string);
      return data.id as string;
    };
    const alertX = await alert(sx, classX, mark("CBX"));
    const alertY = await alert(sy, classY, mark("CBY"));

    const help = async (s: { id: string; nickname: string }, classId: string, to: "teacher" | "counselor", m: string) => {
      const { data, error } = await admin
        .from("help_requests")
        .insert({ student_id: s.id, class_id: classId, nickname: s.nickname, to_role: to, when_pref: "break", note: `Lời nhờ thử ${m}` })
        .select("id")
        .single();
      if (error || !data) throw error;
      made.help.push(data.id as string);
      return data.id as string;
    };
    const helpXteacher = await help(sx, classX, "teacher", mark("LNX")); // GVCN lớp X ĐƯỢC thấy (đối chứng)
    const helpYteacher = await help(sy, classY, "teacher", mark("LNY"));
    const helpXcounselor = await help(sx, classX, "counselor", mark("LNTV"));

    const [cTeacher, cCounselor, cStudent] = await Promise.all([
      cookieFor(teacher.email, teacher.password),
      cookieFor(counselor.email, counselor.password),
      cookieFor(sx.email, sx.password),
    ]);

    const A = {
      updateAlert: action("app/actions/staff.ts", "updateAlert"),
      resetStudentPassword: action("app/actions/staff.ts", "resetStudentPassword"),
      replyHelpRequest: action("app/actions/help-inbox.ts", "replyHelpRequest"),
      setHelpRequestDone: action("app/actions/help-inbox.ts", "setHelpRequestDone"),
      markHelpSeen: action("app/actions/help-inbox.ts", "markHelpSeen"),
      setContentStatus: action("app/actions/support-content.ts", "setContentStatus"),
    };
    const alertRow = async (id: string) => (await admin.from("alerts").select("status, note, handled_by").eq("id", id).single()).data;
    const helpRow = async (id: string) => (await admin.from("help_requests").select("*").eq("id", id).single()).data as Record<string, unknown>;

    // ── ĐỐI CHỨNG: tài khoản đúng quyền thấy được dữ liệu, để "không thấy" bên dưới là do bị chặn ──
    const ctlClass = await page(cTeacher, `/staff/classes/${classX}`);
    const ctlInbox = await page(cTeacher, "/staff/loi-nho");
    const ctlCounselor = await page(cCounselor, "/staff/alerts");
    const controls = [
      ["GVCN lớp X mở trang lớp X", ctlClass.status === 200 && ctlClass.body.includes(`PQX${tag}`)],
      ["GVCN lớp X thấy lời nhờ của học sinh lớp X gửi mình", ctlInbox.status === 200 && ctlInbox.body.includes(mark("LNX"))],
      ["Tư vấn viên đọc được nội dung cảnh báo", ctlCounselor.status === 200 && ctlCounselor.body.includes(mark("CBX"))],
    ] as const;
    for (const [name, ok] of controls) console.log(`Đối chứng: ${name}: ${ok ? "đúng" : "SAI"}`);
    if (controls.some(([, ok]) => !ok)) throw new Error("Đối chứng thất bại (web chưa chạy đúng bản build, hoặc dữ liệu thử chưa hiện): kết quả không đáng tin, dừng lại.");
    const controlNote = "đối chứng: tài khoản đúng quyền làm được";

    // ── 1. GVCN lớp X cố xem / sửa dữ liệu lớp Y ──
    const G1 = "GVCN lớp X cố xem dữ liệu lớp Y";
    const pY = await page(cTeacher, `/staff/classes/${classY}`);
    record(G1, "Mở trang lớp Y (biết sẵn mã lớp)", !(pY.status === 200 && pY.body.includes(`PQY${tag}`)), `HTTP ${pY.status}`);
    const pClasses = await page(cTeacher, "/staff/classes");
    record(G1, "Danh sách lớp có lớp Y", !pClasses.body.includes(`PQY${tag}`), pClasses.body.includes(`PQY${tag}`) ? "thấy lớp Y" : "không thấy lớp Y");
    const pAlerts = await page(cTeacher, "/staff/alerts");
    record(G1, "Trang Cảnh báo có cảnh báo của học sinh lớp Y", !pAlerts.body.includes(sy.nickname), pAlerts.body.includes(sy.nickname) ? "thấy" : "không thấy");
    const pInbox = ctlInbox;
    record(G1, "Hộp lời nhờ có lời nhờ của học sinh lớp Y gửi GVCN lớp Y", !pInbox.body.includes(mark("LNY")), pInbox.body.includes(mark("LNY")) ? "thấy" : "không thấy", controlNote);
    const beforeY = await helpRow(helpYteacher);
    const r1 = await callAction(cTeacher, A.replyHelpRequest, [helpYteacher, "Trả lời thử từ GV lớp khác"]);
    const afterY = await helpRow(helpYteacher);
    record(G1, "Gọi thẳng thao tác trả lời lời nhờ của lớp Y", afterY.status === beforeY.status && afterY.reply === beforeY.reply, `máy chủ trả ${r1.status}; lời nhờ ${afterY.reply ? "BỊ ĐỔI" : "không đổi"}`);
    const pwBefore = (await admin.auth.admin.getUserById(sy.id)).data.user?.app_metadata?.must_change_password ?? false;
    const r2 = await callAction(cTeacher, A.resetStudentPassword, [sy.id]);
    const pwAfter = (await admin.auth.admin.getUserById(sy.id)).data.user?.app_metadata?.must_change_password ?? false;
    record(G1, "Gọi thẳng thao tác đặt lại mật khẩu học sinh lớp Y", pwBefore === pwAfter && !/"password"/.test(r2.text), `máy chủ trả ${r2.status}; mật khẩu ${pwAfter !== pwBefore ? "BỊ ĐẶT LẠI" : "không đổi"}`);

    // ── 2. Giáo viên cố làm việc của phòng tham vấn ──
    const G2 = "Giáo viên cố làm việc của phòng tham vấn";
    record(G2, "Đọc nội dung cảnh báo của học sinh lớp mình", !pAlerts.body.includes(mark("CBX")), pAlerts.body.includes(mark("CBX")) ? "THẤY nội dung" : "chỉ thấy có cảnh báo, nội dung bị ẩn");
    const aBefore = await alertRow(alertX);
    const r3 = await callAction(cTeacher, A.updateAlert, [alertX, { status: "seen", note: "giáo viên thử nhận" }]);
    const aAfter = await alertRow(alertX);
    record(G2, "Gọi thẳng thao tác nhận / xử lý cảnh báo (lớp mình)", aAfter?.status === aBefore?.status && aAfter?.note === aBefore?.note, `máy chủ trả ${r3.status}; cảnh báo ${aAfter?.status !== aBefore?.status ? "BỊ ĐỔI" : "không đổi"}`);
    const r3b = await callAction(cTeacher, A.updateAlert, [alertY, { status: "resolved", note: "thử" }]);
    const aY = await alertRow(alertY);
    record(G2, "Gọi thẳng thao tác đóng cảnh báo của lớp Y", aY?.status === "new", `máy chủ trả ${r3b.status}; cảnh báo ${aY?.status === "new" ? "không đổi" : "BỊ ĐỔI"}`);
    record(G2, "Hộp lời nhờ có lời nhờ gửi phòng tham vấn", !pInbox.body.includes(mark("LNTV")), pInbox.body.includes(mark("LNTV")) ? "thấy" : "không thấy");
    const hBefore = await helpRow(helpXcounselor);
    const r4 = await callAction(cTeacher, A.replyHelpRequest, [helpXcounselor, "Giáo viên trả lời thay phòng tham vấn"]);
    const r5 = await callAction(cTeacher, A.setHelpRequestDone, [helpXcounselor, true]);
    await callAction(cTeacher, A.markHelpSeen, [[helpXcounselor]]);
    const hAfter = await helpRow(helpXcounselor);
    record(
      G2,
      "Gọi thẳng thao tác trả lời / đóng / đánh dấu đã xem lời nhờ gửi phòng tham vấn",
      hAfter.status === hBefore.status && hAfter.reply === hBefore.reply && (hAfter.seen_at ?? null) === (hBefore.seen_at ?? null),
      `máy chủ trả ${r4.status}/${r5.status}; lời nhờ ${hAfter.status !== hBefore.status || hAfter.reply ? "BỊ ĐỔI" : "không đổi"}`,
    );
    for (const [p, what] of [
      ["/staff/research", "Kết quả nghiên cứu"],
      ["/staff/content/vong-ho-tro", "Duyệt nội dung vòng hỗ trợ"],
      ["/staff/safety/risk", "Câu nguy hiểm (an toàn)"],
      ["/staff/members", "Quản lý tài khoản"],
    ] as const) {
      const r = await page(cTeacher, p);
      record(G2, `Mở trang ${what}`, blockedPage(r), `HTTP ${r.status}${r.location ? ` → ${r.location}` : ""}`);
    }
    const anyItem = (await admin.from("support_content").select("id, status").limit(1).single()).data;
    if (anyItem) {
      const r6 = await callAction(cTeacher, A.setContentStatus, [anyItem.id, anyItem.status === "on" ? "off" : "on"]);
      const after = (await admin.from("support_content").select("status").eq("id", anyItem.id).single()).data;
      record(G2, "Gọi thẳng thao tác bật / tắt nội dung vòng hỗ trợ", after?.status === anyItem.status, `máy chủ trả ${r6.status}; nội dung ${after?.status === anyItem.status ? "không đổi" : "BỊ ĐỔI"}`);
      if (after?.status !== anyItem.status) await admin.from("support_content").update({ status: anyItem.status }).eq("id", anyItem.id);
    }

    // ── 3. Học sinh cố vào trang thầy cô ──
    const G3 = "Học sinh cố vào trang thầy cô";
    for (const p of ["/staff", "/staff/alerts", `/staff/classes/${classX}`, "/staff/loi-nho", "/staff/research"]) {
      const r = await page(cStudent, p);
      record(G3, `Mở ${p.replace(classX, "<lớp mình>")}`, blockedPage(r) && !r.body.includes(mark("CBX")), `HTTP ${r.status}${r.location ? ` → ${r.location}` : ""}`);
    }
    const s1 = await callAction(cStudent, A.replyHelpRequest, [helpXcounselor, "Học sinh tự trả lời lời nhờ của mình"]);
    const sAfter = await helpRow(helpXcounselor);
    record(G3, "Gọi thẳng thao tác trả lời lời nhờ (lời nhờ của chính mình)", !sAfter.reply && sAfter.status === "new", `máy chủ trả ${s1.status}${s1.redirect ? ` → ${s1.redirect}` : ""}; lời nhờ ${sAfter.reply ? "BỊ ĐỔI" : "không đổi"}`);
    const s2 = await callAction(cStudent, A.updateAlert, [alertX, { status: "resolved", note: "học sinh tự đóng" }]);
    const sAlert = await alertRow(alertX);
    record(G3, "Gọi thẳng thao tác tự đóng cảnh báo về mình", sAlert?.status === "new", `máy chủ trả ${s2.status}; cảnh báo ${sAlert?.status === "new" ? "không đổi" : "BỊ ĐỔI"}`);

    // ── 4. Người chưa đăng nhập ──
    const G4 = "Người chưa đăng nhập";
    for (const p of ["/staff/alerts", "/staff/loi-nho"]) {
      const r = await page(null, p);
      record(G4, `Mở ${p}`, blockedPage(r), `HTTP ${r.status}${r.location ? ` → ${r.location}` : ""}`);
    }

    // ── ĐỐI CHỨNG cho phần gọi thẳng thao tác: đúng người, đúng quyền gọi cùng cách thì PHẢI đổi được dữ liệu.
    // Nếu không, các dòng "không đổi" ở trên có thể chỉ do cách gọi bị hỏng chứ không phải do bị chặn.
    const okAlert = await callAction(cCounselor, A.updateAlert, [alertY, { status: "seen", note: "tư vấn viên nhận (đối chứng)" }]);
    const okReply = await callAction(cTeacher, A.replyHelpRequest, [helpXteacher, "GVCN trả lời lời nhờ lớp mình (đối chứng)"]);
    const ctlAlert = (await alertRow(alertY))?.status === "seen";
    const ctlReply = Boolean((await helpRow(helpXteacher)).reply);
    console.log(`Đối chứng thao tác: tư vấn viên nhận cảnh báo: ${ctlAlert ? "đúng" : "SAI"} (HTTP ${okAlert.status}); GVCN trả lời lời nhờ lớp mình: ${ctlReply ? "đúng" : "SAI"} (HTTP ${okReply.status})`);
    if (!ctlAlert || !ctlReply) throw new Error("Đối chứng thao tác thất bại: cách gọi thẳng thao tác không chạy, các dòng ở trên không đáng tin.");
    actionControl = true;
  } finally {
    // ── dọn dẹp: cảnh báo được giữ lại khi xóa tài khoản, nên xóa riêng ──
    if (made.alerts.length) await admin.from("alerts").delete().in("id", made.alerts);
    if (made.help.length) await admin.from("help_requests").delete().in("id", made.help);
    for (const id of made.users) await admin.auth.admin.deleteUser(id);
    if (made.classes.length) await admin.from("classes").delete().in("id", made.classes);
    const left = made.classes.length ? ((await admin.from("classes").select("id", { count: "exact", head: true }).in("id", made.classes)).count ?? 0) : 0;
    console.log(`\nĐã xóa ${made.users.length} tài khoản thử, ${made.alerts.length} cảnh báo thử, ${made.help.length} lời nhờ thử, ${made.classes.length} lớp thử${left ? " (LỚP CHƯA XÓA ĐƯỢC, xóa tay)" : ""}.`);
  }

  if (!actionControl) {
    console.log("Không lưu kết quả vì đối chứng chưa qua.");
    process.exitCode = 1;
    return;
  }
  const leaks = rows.filter((r) => !r.blocked).length;
  console.log(leaks ? `\n${leaks}/${rows.length} lần thử LỌT!` : `\nChặn được cả ${rows.length}/${rows.length} lần thử.`);
  const t = stamp();
  const dir = path.join(process.cwd(), "ho-so-du-thi/3-kiem-thu/phan-quyen");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `phan-quyen_${t.file}_${versionCode().replace(/\+/g, "-")}.md`);
  writeFileSync(
    file,
    [
      `# Thử phân quyền trang thầy cô · ${t.text}`,
      "",
      `Phiên bản: \`${versionCode()}\` · Web: ${BASE} (bản build trên máy, dùng cơ sở dữ liệu thật) · Lệnh: \`npm run proof:roles -- ${BASE}\``,
      "",
      "Tạo 2 lớp thử (X, Y), 1 GVCN lớp X, 1 tư vấn viên (đối chứng), 1 học sinh mỗi lớp, cảnh báo và lời nhờ thử có mã nhận diện.",
      "Trang được mở bằng HTTP như trình duyệt; thao tác được gọi THẲNG bằng mã thao tác của bản build (bỏ qua giao diện), rồi đọc lại cơ sở dữ liệu xem có gì bị đổi.",
      "Đối chứng trước khi thử: GVCN mở được lớp mình và thấy lời nhờ lớp mình gửi mình; tư vấn viên đọc được nội dung cảnh báo.",
      "Đối chứng sau khi thử (cùng cách gọi thẳng thao tác): tư vấn viên nhận được cảnh báo, GVCN trả lời được lời nhờ lớp mình. Nhờ vậy “không đổi” ở bảng dưới là do bị chặn, không phải do cách gọi hỏng.",
      "Không gửi email. Mọi dữ liệu thử đã xóa ngay sau khi chạy.",
      "",
      `**Kết quả: ${leaks ? `${leaks}/${rows.length} lần thử LỌT` : `chặn được ${rows.length}/${rows.length} lần thử`}.**`,
      "",
      "| # | Nhóm | Lần thử | Kết quả | Chi tiết |",
      "|---|---|---|---|---|",
      ...rows.map((r, i) => `| ${i + 1} | ${r.group} | ${r.attempt} | ${r.blocked ? "✅ Chặn được" : "❌ LỌT"} | ${r.detail} |`),
    ].join("\n") + "\n",
    "utf8",
  );
  console.log(`Đã lưu: ${path.relative(process.cwd(), file)}`);
  process.exitCode = leaks ? 1 : 0;
}

main().catch((e) => {
  console.error("Lỗi:", e);
  process.exitCode = 1;
});
