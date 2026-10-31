import "server-only";
import { chatModel, openai } from "@/lib/ai/openai";
import { defaultStyle, LENGTH_CAPS } from "@/lib/ai/chat-style";
import { getPromptConfig } from "@/lib/ai/prompt-config";
import { buildCompanionPrompt, CONCERN_ADDENDUM } from "@/lib/ai/prompts";
import { stripCardLines } from "@/lib/ai/reply-cards";
import { checkMessageDetailed, CLASSIFIER_DOWN_REASON } from "@/lib/safety/check";
import { buildAlertEmail, shouldEmail } from "@/lib/safety/notify-email";
import type { AlertInput } from "@/lib/safety/alerts";
import { getSetting } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { alertForViewer } from "@/lib/staff-privacy";
import { followupNeedsAlert, LEVEL_LABELS } from "@/lib/worries-shared";
import { demoProfile } from "./people";
import { demoOn, demoRegistry } from "./server";
import { SIMULATED } from "./shared";

// TÌNH HUỐNG NGUY HIỂM GIẢ LẬP. Không dùng câu nguy hiểm thật: bước "nhận ra" được giả lập, còn mọi bước
// SAU đó chạy bằng đúng code / cài đặt thật (câu trả lời soạn sẵn, số điện thoại, cách giấu nội dung với GVCN,
// nội dung email). Cảnh báo chỉ ghi vào lớp MẪU khi đang trình diễn; KHÔNG gửi email.
// Riêng tình huống "nói quá" là câu thường ngày, chạy thật qua bộ phân loại và AI.

export type SimKind = "khan-cap" | "dang-lo" | "noi-qua" | "mat-ket-noi" | "nang-hon";

export const SIM_CASES: { kind: SimKind; title: string; emoji: string; message: string; real: boolean; note: string }[] = [
  {
    kind: "khan-cap",
    title: "Một bạn đang gặp nguy hiểm",
    emoji: "🚨",
    message: "«câu mẫu mức KHẨN CẤP, giả lập: không dùng câu thật»",
    real: false,
    note: "Giả lập bước nhận ra; các bước sau chạy thật.",
  },
  {
    kind: "dang-lo",
    title: "Bị trêu chọc kéo dài",
    emoji: "🟠",
    message: "«câu mẫu mức ĐÁNG LO, giả lập: bị trêu chọc nhiều lần ở lớp»",
    real: false,
    note: "Giả lập bước nhận ra; các bước sau chạy thật.",
  },
  {
    kind: "noi-qua",
    title: "Nói quá cho vui",
    emoji: "😵",
    message: "Bài kiểm tra Toán khó muốn xỉu luôn á",
    real: true,
    note: "Câu thường ngày, chạy THẬT qua bộ phân loại và AI.",
  },
  {
    kind: "mat-ket-noi",
    title: "AI bị mất kết nối",
    emoji: "🔌",
    message: "«một câu bất kỳ, lúc AI phân loại không trả lời được»",
    real: false,
    note: "Giả lập lỗi mạng; quy tắc xử lý chạy thật.",
  },
  {
    kind: "nang-hon",
    title: "Thấy nặng hơn khi trợ lý hỏi lại",
    emoji: "🌧️",
    message: "Bạn chọn «Nặng hơn» và mức «Lo rất nhiều» khi trợ lý hỏi thăm",
    real: false,
    note: "Giả lập lựa chọn của bạn; quy tắc báo thầy cô chạy thật.",
  },
];

export type SimStep = { title: string; detail: string; tone: "ok" | "watch" | "urgent" | "info" };
export type SimResult = {
  kind: SimKind;
  steps: SimStep[];
  reply: { text: string; kind: "crisis" | "gentle" | "normal"; note: string } | null;
  hotlines: { name: string; detail: string }[];
  alert: {
    severity: "watch" | "urgent";
    counselorSees: { excerpt: string | null; reasons: string[] };
    teacherSees: { excerpt: string | null; hidden: boolean };
    email: { to: string[]; subject: string; text: string } | null;
    saved: boolean;
  } | null;
};

async function aiReply(message: string, gentle: boolean): Promise<string> {
  const [config, model] = await Promise.all([getPromptConfig(), chatModel()]);
  const style = defaultStyle(config.styles);
  const res = await openai().responses.create({
    model,
    instructions: buildCompanionPrompt(config, style, "Bạn thử", { concern: gentle }),
    input: message,
    reasoning: { effort: "low" },
    max_output_tokens: LENGTH_CAPS[style.length].maxOutputTokens,
    store: false,
  });
  // lượt đáng lo: máy chủ bỏ mọi dòng thẻ gợi ý như khi trò chuyện thật
  return stripCardLines(res.output_text);
}

export async function simulate(kind: SimKind): Promise<SimResult> {
  const registry = await demoRegistry();
  const crisis = await getSetting("safety.crisis");
  const hotlines = [crisis.school, ...crisis.hotlines].map((h) => ({ name: h.name, detail: h.detail }));
  // bạn mẫu "gặp chuyện" trong giả lập (không phải bạn đang được kể hành trình)
  const student = registry ? await demoProfile(registry.showcase.b) : null;
  const steps: SimStep[] = [];
  let reply: SimResult["reply"] = null;
  let alertInput: (Omit<AlertInput, "profile"> & { excerpt: string | null }) | null = null;

  if (kind === "khan-cap") {
    steps.push(
      { title: "Bộ lọc từ khóa", detail: "(giả lập) khớp một cụm từ mức khẩn cấp → không cần chờ AI.", tone: "urgent" },
      { title: "Không để AI tự trả lời", detail: "Bỏ bản nháp AI đang soạn. Gửi câu trả lời soạn sẵn do thầy cô duyệt.", tone: "urgent" },
      { title: "Báo thầy cô ngay", detail: "Ghi cảnh báo mức KHẨN, gửi email cho tư vấn viên và GVCN (email không kèm nội dung).", tone: "urgent" },
    );
    reply = { text: crisis.message, kind: "crisis", note: "Câu soạn sẵn, lấy từ mục Khi khẩn cấp" };
    alertInput = { type: "chat_risk", severity: "urgent", excerpt: `${SIMULATED} (mức khẩn cấp)`, reasons: ["Giả lập: khớp cụm từ mức khẩn cấp"] };
  } else if (kind === "dang-lo") {
    steps.push(
      { title: "AI phân loại có xét bối cảnh", detail: "(giả lập) mức ĐÁNG LO: có dấu hiệu bị trêu chọc kéo dài.", tone: "watch" },
      { title: "Trợ lý trả lời nhẹ nhàng hơn", detail: "Thêm lời dặn riêng cho lượt này (bên dưới), hiện thẻ số điện thoại hỗ trợ.", tone: "watch" },
      { title: "Báo thầy cô", detail: "Ghi cảnh báo mức Cần để ý. Không gửi email (chỉ gửi khi khẩn).", tone: "watch" },
    );
    reply = { text: CONCERN_ADDENDUM.trim(), kind: "gentle", note: "Lời dặn thêm cho AI ở lượt này (AI vẫn tự viết câu trả lời)" };
    alertInput = {
      type: "chat_risk",
      severity: "watch",
      excerpt: `${SIMULATED} Bạn kể bị trêu chọc nhiều lần ở lớp`,
      reasons: ["Giả lập: có dấu hiệu bị trêu chọc kéo dài"],
    };
  } else if (kind === "noi-qua") {
    const message = SIM_CASES.find((c) => c.kind === kind)!.message;
    const started = Date.now();
    const detail = await checkMessageDetailed(message, []);
    const kw = detail.layers.keyword.level;
    const ai = detail.layers.classifier === "error" ? "lỗi" : detail.layers.classifier.level;
    steps.push(
      { title: "Bộ lọc từ khóa", detail: kw === "none" ? "Không khớp: \"muốn xỉu\" là nói quá, không có trong danh sách." : `Khớp mức ${kw}.`, tone: kw === "none" ? "ok" : "watch" },
      {
        title: "AI phân loại có xét bối cảnh",
        detail: `Kết quả thật: ${ai === "none" ? "BÌNH THƯỜNG (nói quá về chuyện thường ngày)" : ai} · ${Date.now() - started} ms`,
        tone: ai === "none" ? "ok" : "watch",
      },
      {
        title: "Không báo động nhầm",
        detail: detail.level === "none" ? "Không ghi cảnh báo, không làm phiền thầy cô." : `Kết luận: ${detail.level}.`,
        tone: detail.level === "none" ? "ok" : "watch",
      },
    );
    reply = { text: await aiReply(message, detail.level !== "none").catch(() => "(AI chưa trả lời được lúc này)"), kind: "normal", note: "Câu trả lời thật của trợ lý" };
  } else if (kind === "mat-ket-noi") {
    steps.push(
      { title: "AI phân loại không trả lời", detail: "(giả lập) hết thời gian chờ 10 giây hoặc mất mạng.", tone: "info" },
      { title: "Không chắc thì coi là cần để ý", detail: `Ghi lý do: "${CLASSIFIER_DOWN_REASON}". Không bao giờ coi là "ổn".`, tone: "watch" },
      { title: "Vẫn còn lưới an toàn", detail: "Bộ lọc từ khóa chạy trên máy chủ, không cần mạng, vẫn bắt được câu rõ ràng.", tone: "watch" },
    );
    alertInput = { type: "chat_risk", severity: "watch", excerpt: `${SIMULATED} (lúc AI mất kết nối)`, reasons: [CLASSIFIER_DOWN_REASON] };
  } else {
    const answer = { feeling: "worse" as const, level: 5 };
    steps.push(
      { title: "Trợ lý hỏi thăm sau 3 ngày", detail: "Bạn chọn «Nặng hơn» và «Lo rất nhiều» (giả lập lựa chọn).", tone: "info" },
      { title: "Quy tắc báo thầy cô", detail: followupNeedsAlert(answer) ? "Nặng hơn + Lo rất nhiều → báo thầy cô phụ trách." : "Không báo.", tone: "watch" },
      { title: "Chỉ báo chủ đề và mức lo", detail: "KHÔNG kèm dòng bạn tự viết. Trong 24 giờ chỉ báo một lần.", tone: "watch" },
    );
    alertInput = {
      type: "worry_worse",
      severity: "watch",
      excerpt: `Trợ lý hỏi thăm chuyện "Bạn bè": học sinh chọn "Nặng hơn", mức lo "${LEVEL_LABELS[4]}" (lúc kể: "${LEVEL_LABELS[2]}"). Không kèm chuyện học sinh kể.`,
      reasons: ["Học sinh tự đánh giá: nặng hơn, lo rất nhiều"],
    };
  }

  let alert: SimResult["alert"] = null;
  if (alertInput) {
    const profile = student ?? { id: "", nickname: "Bạn mẫu", full_name: null, class_id: null };
    const row = {
      id: "",
      student_id: profile.id,
      class_id: profile.class_id,
      class_name: null,
      nickname: profile.nickname,
      full_name: profile.full_name,
      type: alertInput.type,
      severity: alertInput.severity,
      excerpt: alertInput.excerpt,
      reasons: alertInput.reasons ?? [],
      status: "new" as const,
      note: null,
      handled_by: null,
      handled_by_name: null,
      handled_at: null,
      created_at: new Date().toISOString(),
      otherAlerts: 0,
    };
    const teacher = alertForViewer(row, "teacher");
    let email: NonNullable<SimResult["alert"]>["email"] = null;
    let to: string[] = [];
    if (student?.class_id) {
      const db = createAdminClient();
      const [{ data: cls }, { data: counselors }] = await Promise.all([
        db.from("classes").select("name, homeroom:profiles!classes_homeroom_teacher_id_fkey(nickname)").eq("id", student.class_id).maybeSingle(),
        db.from("profiles").select("nickname").in("id", registry?.staffIds ?? []).eq("role", "counselor"),
      ]);
      to = [...(counselors ?? []).map((c) => c.nickname as string), (cls?.homeroom as unknown as { nickname: string } | null)?.nickname].filter(
        (x): x is string => Boolean(x),
      );
      if (shouldEmail({ severity: alertInput.severity, type: alertInput.type })) {
        const built = buildAlertEmail({ ...alertInput, excerpt: alertInput.excerpt ?? undefined, profile: student }, { className: cls?.name ?? null, appUrl: process.env.APP_URL ?? null, at: new Date() });
        email = { to, ...built };
      }
    }
    // chỉ ghi vào lớp mẫu, và chỉ khi đang trình diễn; KHÔNG gọi createAlert nên không có email nào được gửi
    let saved = false;
    if (student && (await demoOn())) {
      const { error } = await createAdminClient().from("alerts").insert({
        student_id: student.id,
        class_id: student.class_id,
        nickname: student.nickname,
        full_name: student.full_name,
        type: alertInput.type,
        severity: alertInput.severity,
        excerpt: alertInput.excerpt,
        reasons: alertInput.reasons ?? [],
      });
      saved = !error;
    }
    alert = {
      severity: alertInput.severity,
      counselorSees: { excerpt: alertInput.excerpt, reasons: alertInput.reasons ?? [] },
      teacherSees: { excerpt: teacher.excerpt, hidden: teacher.contentHidden },
      email,
      saved,
    };
  }
  return { kind, steps, reply, hotlines, alert };
}
