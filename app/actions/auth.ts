"use server";

import { randomUUID, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { supabaseSecretKey } from "@/lib/env";
import { decoyStudentEmail, studentEmail } from "@/lib/student-email";
import {
  classCodeSchema,
  firstError,
  fullNameSchema,
  nicknameSchema,
  passwordSchema,
} from "@/lib/validation";

export type AuthResult = { ok: true; email: string } | { ok: false; error: string };

const LOGIN_FAILED = "Mã lớp, biệt danh hoặc mật khẩu chưa đúng.";

async function findClass(code: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("classes").select("id, name").eq("code", code).maybeSingle();
  return data as { id: string; name: string } | null;
}

/**
 * Bước 1 của đăng nhập: tìm email ẩn của học sinh theo mã lớp + biệt danh.
 * Việc kiểm tra mật khẩu do trình duyệt gửi thẳng tới Supabase Auth.
 *
 * Không tìm thấy lớp / biệt danh thì vẫn trả về một email "mồi" (không ai có),
 * để người ngoài không dò được biệt danh nào đang có trong lớp: mọi trường hợp sai
 * đều chỉ thấy "Mã lớp, biệt danh hoặc mật khẩu chưa đúng" ở bước mật khẩu.
 */
export async function lookupStudent(input: {
  classCode: string;
  nickname: string;
}): Promise<AuthResult> {
  const parsed = z
    .object({ classCode: classCodeSchema, nickname: nicknameSchema })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: LOGIN_FAILED };
  const { classCode, nickname } = parsed.data;

  const cls = await findClass(classCode);
  // luôn chạy đủ 2 truy vấn để thời gian trả lời không lộ "mã lớp có tồn tại không"
  const { data: profile } = await createAdminClient()
    .from("profiles")
    .select("id")
    .eq("class_id", cls?.id ?? "00000000-0000-0000-0000-000000000000")
    .ilike("nickname", escapeLike(nickname))
    .maybeSingle();

  return {
    ok: true,
    email: profile ? studentEmail(profile.id) : await decoyStudentEmail(supabaseSecretKey(), classCode, nickname),
  };
}

/** Đăng ký tài khoản học sinh mới. */
export async function registerStudent(input: {
  classCode: string;
  nickname: string;
  fullName: string;
  password: string;
}): Promise<AuthResult> {
  const parsed = z
    .object({
      classCode: classCodeSchema,
      nickname: nicknameSchema,
      fullName: fullNameSchema,
      password: passwordSchema,
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { classCode, nickname, fullName, password } = parsed.data;

  const cls = await findClass(classCode);
  if (!cls) return { ok: false, error: "Không tìm thấy mã lớp này. Hỏi lại thầy cô chủ nhiệm nhé." };

  const admin = createAdminClient();
  const { data: taken } = await admin
    .from("profiles")
    .select("id")
    .eq("class_id", cls.id)
    .ilike("nickname", escapeLike(nickname))
    .maybeSingle();
  if (taken) return { ok: false, error: "Biệt danh này đã có bạn trong lớp dùng rồi. Chọn tên khác nhé." };

  const id = randomUUID();
  const email = studentEmail(id);
  const { error: createError } = await admin.auth.admin.createUser({
    id,
    email,
    password,
    email_confirm: true,
    user_metadata: { nickname },
  });
  if (createError) {
    console.error("createUser failed", createError);
    return { ok: false, error: "Chưa tạo được tài khoản. Thử lại sau ít phút nhé." };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .insert({ id, class_id: cls.id, nickname, full_name: fullName, role: "student" });
  if (profileError) {
    await admin.auth.admin.deleteUser(id);
    if (profileError.code === "23505") {
      return { ok: false, error: "Biệt danh này vừa có bạn dùng mất rồi. Chọn tên khác nhé." };
    }
    console.error("insert profile failed", profileError);
    return { ok: false, error: "Chưa tạo được tài khoản. Thử lại sau ít phút nhé." };
  }

  return { ok: true, email };
}

/** Mã chung để thầy cô tự tạo tài khoản (đặt trong biến môi trường STAFF_SIGNUP_CODE). */
function signupCodeMatches(code: string): boolean {
  const expected = process.env.STAFF_SIGNUP_CODE?.trim().toUpperCase();
  if (!expected) return false;
  const a = Buffer.from(code.trim().toUpperCase());
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Thầy cô tự tạo tài khoản bằng mã trường. Tài khoản mới luôn là giáo viên
 * và chưa phụ trách lớp nào, nên chưa xem được dữ liệu học sinh cho đến khi
 * admin gán lớp chủ nhiệm (hoặc đổi sang phòng tham vấn).
 */
export async function registerStaff(input: {
  code: string;
  name: string;
  email: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = z
    .object({
      code: z.string().max(64),
      name: fullNameSchema,
      email: z.email("Email chưa đúng").transform((s) => s.trim().toLowerCase()),
      password: z.string().min(8, "Mật khẩu cần ít nhất 8 ký tự").max(72, "Mật khẩu quá dài"),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { code, name, email, password } = parsed.data;

  if (!process.env.STAFF_SIGNUP_CODE) {
    return { ok: false, error: "Trường chưa mở đăng ký cho thầy cô. Liên hệ admin để được tạo tài khoản." };
  }
  if (!signupCodeMatches(code)) {
    // chậm lại một chút để khó dò mã
    await new Promise((r) => setTimeout(r, 800));
    return { ok: false, error: "Mã đăng ký chưa đúng." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error || !data.user) {
    return {
      ok: false,
      error:
        error?.code === "email_exists"
          ? "Email này đã có tài khoản. Hãy đăng nhập, hoặc nhờ admin đặt lại mật khẩu."
          : error?.code === "weak_password"
            ? "Mật khẩu quá dễ đoán. Chọn mật khẩu khác nhé."
            : "Chưa tạo được tài khoản. Thử lại sau ít phút.",
    };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    nickname: name,
    full_name: name,
    email,
    role: "teacher",
    onboarded_at: new Date().toISOString(),
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    console.error("insert staff profile failed", profileError);
    return { ok: false, error: "Chưa tạo được tài khoản. Thử lại sau ít phút." };
  }
  return { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/** ilike dùng % và _ làm ký tự đại diện, cần thoát để so khớp đúng nguyên văn. */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => "\\" + c);
}
