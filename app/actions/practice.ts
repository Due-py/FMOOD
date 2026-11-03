"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile, type Profile } from "@/lib/auth";
import { wordCount } from "@/lib/activity-describe";
import { logActivity } from "@/lib/activity-log";
import { alternativeExample, bridgeSentence, partnerReply, practiceFeedback, practiceHints, reviewReaction, roleplayReply } from "@/lib/ai/practice-feedback";
import { LIMITS, type PracticeResult, type PracticeView, type RoleplayTurn } from "@/lib/practice/shared";
import {
  insertAttempt,
  insertSession,
  loadSession,
  recentSessionCount,
  recordPracticeMeasure,
  removeSession,
  sampleFor,
  saveSnapshot,
  situationOf,
  toSnapshot,
  updateAttempt,
  updateSession,
  viewOf,
  type LoadedSession,
} from "@/lib/practice/server";
import { readTurns, roleplayBlocked, roleplayOf, roleplayOpening } from "@/lib/practice/roleplay";
import { parseStart } from "@/lib/practice/rows";
import {
  aiAllowed,
  cleanAnswers,
  ROLEPLAY_STOPPED,
  roleplayStopped,
  transition,
  type AiUse,
  type Answers,
  type PracticeEvent,
  type Snapshot,
} from "@/lib/practice/state";
import { createAlert } from "@/lib/safety/alerts";
import { checkMessage, CLASSIFIER_DOWN_REASON, keywordLayer, type SafetyResult } from "@/lib/safety/check";
import { crisisResponse } from "@/lib/safety/crisis";
import { crisisWithStatus, PEER_CRISIS_MESSAGE } from "@/lib/safety/crisis-text";
import { maxLevel } from "@/lib/safety/keywords";
import { caseByCode, isPeerRiskSkill, peerAlertLabel, SKILLS, type SkillId } from "@/lib/skills";

// CÁC NÚT TRONG BÀI LUYỆN KỸ NĂNG (kế hoạch Demo 3, Bước 3).
// Mỗi hàm: kiểm tra đăng nhập, đọc lại bài luyện CỦA CHÍNH học sinh này, chuyển trạng thái bằng hàm thuần
// lib/practice/state.ts (AI không bao giờ đổi trạng thái), rồi mới gọi AI nếu cần.
// Chữ học sinh viết được quét an toàn như tin nhắn TRƯỚC mọi lần gọi AI:
//   khẩn cấp → "Chuyển an toàn": dừng bài và AI, hiện câu soạn sẵn, báo thầy cô (lesson_risk, urgent)
//   đáng lo  → vẫn cho luyện, ghi cảnh báo theo dõi (watch)

const NOT_READY = "Phần luyện kỹ năng chưa sẵn sàng. Bạn quay lại sau nhé.";
const NOT_FOUND = "Không tìm thấy bài luyện này.";
const SAVE_FAILED = "Chưa lưu được. Bạn thử lại nhé.";
const MAX_NEW_PER_10_MIN = 8;

type Crisis = { ok: false; crisis: { text: string; notified: boolean } };

/** Quét an toàn chữ học sinh viết (giống trò chuyện): từ khóa rõ nguy hiểm thì không chờ AI; lỗi thì coi là đáng lo. */
async function scan(text: string): Promise<SafetyResult> {
  const keyword = await keywordLayer(text);
  if (keyword.level === "urgent") return keyword;
  return checkMessage(text, []).catch((error) => {
    console.error("[F-Mood] Kiểm tra an toàn bài luyện lỗi", error);
    return { level: maxLevel(keyword.level, "concern"), reasons: [...keyword.reasons, CLASSIFIER_DOWN_REASON] };
  });
}

/**
 * Kiểm tra chữ học sinh vừa viết. Khẩn cấp: chuyển bài sang "Chuyển an toàn" (nếu đã có bài), báo thầy cô,
 * trả về câu soạn sẵn nói đúng thầy cô đã được báo hay chưa. Đáng lo: ghi cảnh báo theo dõi, `concern` (vẫn luyện tiếp;
 * riêng vai bạn cùng lớp thì thoát vai).
 * Mô-đun viết về một bạn khác (PEER_RISK_SKILLS, Duy quyết 01/11): cảnh báo y như cũ (cùng loại, cùng mức) nhưng ghi nhãn
 * "Về một bạn khác (bài luyện: …)", và câu khẩn cấp là bản dành cho người đang lo cho bạn (chữ cố định).
 */
async function safetyCheck(profile: Profile, text: string, loaded: LoadedSession | null, skill: SkillId | null): Promise<{ crisis: Crisis | null; concern: boolean }> {
  if (!text.trim()) return { crisis: null, concern: false };
  const safety = await scan(text);
  if (safety.level === "none") return { crisis: null, concern: false };
  const context = peerAlertLabel(skill);
  if (safety.level === "concern") {
    await createAlert({ profile, type: "lesson_risk", severity: "watch", excerpt: text, reasons: safety.reasons, context });
    return { crisis: null, concern: true };
  }
  if (loaded) {
    const t = transition(toSnapshot(loaded), { type: "safety_urgent" }, "server");
    if (t.ok) await saveSnapshot(profile.id, loaded.session.id, t.next);
  }
  const [message, notified] = await Promise.all([
    isPeerRiskSkill(skill) ? PEER_CRISIS_MESSAGE : crisisResponse(),
    createAlert({ profile, type: "lesson_risk", severity: "urgent", excerpt: text, reasons: safety.reasons, context }),
  ]);
  return { crisis: { ok: false, crisis: { text: crisisWithStatus(message, notified), notified } }, concern: false };
}

async function safetyGate(profile: Profile, text: string, loaded: LoadedSession | null, skill: SkillId | null): Promise<Crisis | null> {
  return (await safetyCheck(profile, text, loaded, skill)).crisis;
}

const idSchema = z.uuid();

/** Bài luyện của chính học sinh đang đăng nhập, hoặc kết quả lỗi để trả thẳng cho trình duyệt. */
async function own(id: string): Promise<{ profile: Profile; loaded: LoadedSession } | { ok: false; error: string }> {
  const profile = await requireProfile();
  if (!idSchema.safeParse(id).success) return { ok: false, error: NOT_FOUND };
  const loaded = await loadSession(profile.id, id);
  if (loaded === "missing") return { ok: false, error: NOT_READY };
  if (!loaded) return { ok: false, error: NOT_FOUND };
  return { profile, loaded };
}

/** Đọc lại bài sau khi lưu để trả về đúng dữ liệu đang có. */
async function fresh(profile: Profile, id: string): Promise<PracticeView | null> {
  const loaded = await loadSession(profile.id, id);
  return loaded && loaded !== "missing" ? viewOf(loaded) : null;
}

async function done<T extends object>(profile: Profile, id: string, extra?: T): Promise<PracticeResult<T>> {
  const view = await fresh(profile, id);
  if (!view) return { ok: false, error: SAVE_FAILED };
  return { ok: true, view, ...(extra as T) };
}

/** Áp một chuỗi sự kiện của học sinh; trả trạng thái mới hoặc lý do bị từ chối. */
function applyAll(s: Snapshot, events: PracticeEvent[]): { ok: true; next: Snapshot; aiHint?: boolean } | { ok: false; reason: string } {
  let cur = s;
  let aiHint: boolean | undefined;
  for (const e of events) {
    const t = transition(cur, e, "student");
    if (!t.ok) return t;
    cur = t.next;
    aiHint = t.aiHint ?? aiHint;
  }
  return { ok: true, next: cur, aiHint };
}

const usesWith = (loaded: LoadedSession, use: AiUse) => ({ ...loaded.session.ai_uses, [use]: (loaded.session.ai_uses[use] ?? 0) + 1 });

// ───────── Mở bài ─────────

/** Nơi học sinh bấm mở bài luyện (chỉ để đo; không bao giờ là chữ học sinh viết). */
const PRACTICE_FROM = ["chat", "library", "journal", "checkin", "skills", "home"] as const;
export type PracticeFrom = (typeof PRACTICE_FROM)[number];

/**
 * Học sinh chọn kỹ năng và tình huống (mẫu TL hoặc tình huống của mình) để bắt đầu.
 * `subskill`: id kỹ năng thành phần đã có mô-đun luyện, hoặc slug của nó; không nhận chữ tự do (ví dụ lời chat).
 */
export async function startPractice(input: {
  subskill: string;
  caseCode?: string | null;
  ownSituation?: string | null;
  from?: PracticeFrom;
}): Promise<{ ok: true; id: string } | { ok: false; error: string } | Crisis> {
  const profile = await requireProfile();
  // không muốn kể chuyện riêng thì chọn tình huống mẫu (hàm thuần, có test ở lib/practice/rows.test.ts)
  const start = parseStart({ subskill: input?.subskill, caseCode: input?.caseCode, ownSituation: input?.ownSituation });
  const from = (PRACTICE_FROM as readonly string[]).includes(String(input?.from)) ? (input.from as PracticeFrom) : null;
  if (!start.ok) return start;
  const { skill, caseCode, ownSituation } = start;
  if ((await recentSessionCount(profile.id)) >= MAX_NEW_PER_10_MIN) return { ok: false, error: "Bạn mở nhiều bài quá rồi. Làm tiếp bài đang dở, hoặc nghỉ một chút nhé." };

  // tình huống học sinh tự kể được quét an toàn như tin nhắn
  if (ownSituation) {
    const crisis = await safetyGate(profile, ownSituation, null, skill);
    if (crisis) return crisis;
  }
  const created = await insertSession(profile.id, { skill, caseCode, ownSituation });
  if (created === "missing") return { ok: false, error: NOT_READY };
  if (!created) return { ok: false, error: SAVE_FAILED };
  // mã ngắn: "<id>", "<id>|TL09"; thêm "|from:<nơi mở>" khi biết (lib/sel/legacy.ts subskillFromRef đọc được cả dạng cũ)
  logActivity(profile, "practice_open", [skill, caseCode ?? (ownSituation ? "own" : null), from && `from:${from}`].filter(Boolean).join("|"));
  revalidatePath("/luyen");
  return { ok: true, id: created.id };
}

// ───────── Đi tiếp, bỏ qua, tạm dừng, mở lại ─────────

/** Nút "Tiếp", "Bỏ qua", "Dừng ở đây", "Làm tiếp". */
export async function stepPractice(id: string, type: string): Promise<PracticeResult> {
  if (!["next", "skip", "pause", "resume"].includes(type)) return { ok: false, error: SAVE_FAILED };
  const found = await own(id);
  if ("ok" in found) return found;
  const { profile, loaded } = found;
  const s = toSnapshot(loaded);
  // bài mới mở: bấm "Tiếp" ở bước Hiểu là bắt đầu luôn
  const events: PracticeEvent[] = s.state === "not_started" && type !== "resume" && type !== "pause" ? [{ type: "start" }] : [];
  events.push({ type } as PracticeEvent);
  const t = applyAll(s, events);
  if (!t.ok) return { ok: false, error: t.reason, view: viewOf(loaded) };
  if (!(await saveSnapshot(profile.id, id, t.next))) return { ok: false, error: SAVE_FAILED };
  return done(profile, id);
}

// ───────── Hiểu: câu nối với tình huống riêng ─────────

/** Một câu nối kỹ năng với tình huống của học sinh (chỉ khi dùng tình huống riêng, tối đa 1 lần mỗi bài). */
export async function practiceBridge(id: string): Promise<PracticeResult> {
  const found = await own(id);
  if ("ok" in found) return found;
  const { profile, loaded } = found;
  const { session } = loaded;
  if (!session.own_situation || session.bridge || !aiAllowed("bridge", session.ai_uses, session.state)) return { ok: true, view: viewOf(loaded) };
  // tình huống đã được quét an toàn lúc mở bài
  const bridge = await bridgeSentence(session.skill, session.own_situation);
  await updateSession(profile.id, id, { ai_uses: usesWith(loaded, "bridge"), ...(bridge ? { bridge } : {}) });
  return done(profile, id);
}

// ───────── Mẫu: ví dụ khác ─────────

/** Nút "Cho mình ví dụ khác": trợ lý viết một ví dụ mới ở tình huống KHÁC (tối đa 1 lần mỗi bài). */
export async function practiceExample(id: string): Promise<PracticeResult<{ example: { situation: string; lines: string[] } | null }>> {
  const found = await own(id);
  if ("ok" in found) return found;
  const { profile, loaded } = found;
  const { session } = loaded;
  if (!aiAllowed("example", session.ai_uses, session.state)) return { ok: false, error: "Bài này đã xem ví dụ khác rồi. Bạn dùng khung có chỗ trống nhé." };
  const sample = await sampleFor(profile.id, session);
  const example = await alternativeExample(session.skill, situationOf(session).text, sample.situation);
  await updateSession(profile.id, id, { ai_uses: usesWith(loaded, "example") });
  return done(profile, id, { example });
}

// ───────── Cần gợi ý thêm ─────────

/**
 * Học sinh bấm "Mình chưa biết" ở một ô. Còn lượt: trợ lý đưa tối đa 3 câu hỏi / lựa chọn (không đưa đáp án).
 * Hết lượt (2 lần mỗi bài): không gọi AI, cho xem mẫu hoặc bỏ qua ô.
 */
export async function practiceHint(id: string, fieldKey: string, draft: Record<string, unknown>): Promise<PracticeResult<{ hints: string[] | null; showExample: boolean }>> {
  const found = await own(id);
  if ("ok" in found) return found;
  const { profile, loaded } = found;
  const skill = loaded.session.skill;
  if (!SKILLS[skill].fields.some((f) => f.key === fieldKey)) return { ok: false, error: SAVE_FAILED };
  const answers = cleanAnswers(skill, draft ?? {}, LIMITS.field);
  const t = transition(toSnapshot(loaded), { type: "dont_know" }, "student");
  if (!t.ok) return { ok: false, error: t.reason, view: viewOf(loaded) };
  // chữ đang viết dở cũng được quét trước khi đưa cho AI
  const crisis = await safetyGate(profile, Object.values(answers).join("\n"), loaded, skill);
  if (crisis) return crisis;
  if (!(await saveSnapshot(profile.id, id, t.next))) return { ok: false, error: SAVE_FAILED };
  const hints = t.aiHint
    ? await practiceHints({ skill, fieldKey, situation: situationOf(loaded.session).text, answers, coping: caseByCode(loaded.session.case_code)?.coping ?? null })
    : null;
  return done(profile, id, { hints, showExample: !hints });
}

// ───────── Tự làm: lưu lần 1, lần 2 ─────────

/** Lưu bài làm: lần 1 ở bước Tự làm; lần 2 ở bước Góp ý (sau khi đọc góp ý) hoặc Nhìn lại. */
export async function submitPractice(id: string, raw: Record<string, unknown>): Promise<PracticeResult> {
  const found = await own(id);
  if ("ok" in found) return found;
  const { profile, loaded } = found;
  const skill = loaded.session.skill;
  const answers = cleanAnswers(skill, raw ?? {}, LIMITS.field);
  const s = toSnapshot(loaded);

  // lần 2 giống hệt lần 1: chưa tiến (2 lượt liền thì chuyển "Cần gợi ý thêm")
  if (s.versions === 1 && s.step !== "T" && sameAnswers(s.answers, answers)) {
    const t = transition(s, { type: "answer", progressed: false }, "student");
    if (t.ok) await saveSnapshot(profile.id, id, t.next);
    const view = await fresh(profile, id);
    return { ok: false, error: "Bài sửa chưa khác lần 1. Bạn thử sửa theo câu hỏi góp ý, hoặc bấm “Mình chưa biết” nhé.", ...(view ? { view } : {}) };
  }
  const t = transition(s, { type: "submit", answers }, "student");
  if (!t.ok) return { ok: false, error: t.reason, view: viewOf(loaded) };

  // bài làm được quét an toàn như tin nhắn (trước khi lưu và trước mọi lần gọi AI)
  const crisis = await safetyGate(profile, Object.values(answers).join("\n"), loaded, skill);
  if (crisis) return crisis;

  const version = t.next.versions as 1 | 2;
  if (!(await insertAttempt(profile.id, id, version, answers))) return { ok: false, error: SAVE_FAILED };
  if (!(await saveSnapshot(profile.id, id, t.next))) return { ok: false, error: SAVE_FAILED };
  // nhật ký: số chữ của bài làm, không ghi bài làm
  const words = wordCount(Object.values(answers).join(" "));
  if (version === 1) {
    void recordPracticeMeasure(profile.id, "practice_done", skill);
    logActivity(profile, "practice_submit", `${skill}|${words}`);
  } else {
    void recordPracticeMeasure(profile.id, "practice_revised", skill);
    logActivity(profile, "practice_revise", `${skill}|${words}`);
  }
  return done(profile, id);
}

function sameAnswers(a: Answers, b: Answers): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((k) => (a[k] ?? "") === (b[k] ?? ""));
}

// ───────── Góp ý ─────────

/** Nút "Nhờ trợ lý góp ý": đúng 3 ý theo tiêu chí; AI lỗi thì danh sách tiêu chí cố định. Tối đa 2 lượt mỗi bài. */
export async function requestPracticeFeedback(id: string): Promise<PracticeResult> {
  const found = await own(id);
  if ("ok" in found) return found;
  const { profile, loaded } = found;
  const t = transition(toSnapshot(loaded), { type: "feedback" }, "student");
  if (!t.ok) return { ok: false, error: t.reason, view: viewOf(loaded) };
  const latest = [...loaded.attempts].sort((a, b) => b.version - a.version)[0];
  const previous = latest.version === 2 ? loaded.attempts.find((a) => a.version === 1)?.answers : null;
  // bài làm đã được quét an toàn lúc lưu
  const feedback = await practiceFeedback({
    skill: loaded.session.skill,
    situation: situationOf(loaded.session).text,
    answers: latest.answers,
    previous,
    coping: caseByCode(loaded.session.case_code)?.coping ?? null,
  });
  if (!(await updateAttempt(profile.id, id, latest.version, { feedback }))) return { ok: false, error: SAVE_FAILED };
  if (!(await saveSnapshot(profile.id, id, t.next))) return { ok: false, error: SAVE_FAILED };
  void recordPracticeMeasure(profile.id, "practice_feedback", loaded.session.skill);
  logActivity(profile, "practice_feedback", loaded.session.skill);
  return done(profile, id);
}

// ───────── Tập nói (vai thầy cô ở "Mở lời nhờ người giúp"; vai bạn cùng lớp ở 3 mô-đun mới) ─────────

/** Thầy cô trong vai khi trợ lý chưa trả lời được: câu soạn sẵn, vẫn hỏi lại như thầy cô thật. */
const TEACHER_FALLBACK = "Thầy cô nghe rồi. Em nói rõ hơn giúp thầy cô là em vướng ở bước nào nhé?";

/**
 * Tập nói (tối đa 4 lượt, lib/practice/roleplay.ts):
 * - Mở lời nhờ người giúp: học sinh nói lời nhờ, trợ lý đóng vai thầy cô được nhờ và hỏi lại (không viết lại lời nhờ). Như cũ.
 * - Nghe bạn / giải quyết bất đồng / nói "không": bạn cùng lớp trong vai nói câu mở đầu soạn sẵn của tình huống mẫu, học sinh
 *   đáp, trợ lý đáp tiếp trong vai. CHỈ với tình huống mẫu TL (không với chuyện tự kể). Lớp an toàn xếp "đáng lo", hoặc trợ lý
 *   báo cần thoát vai: dừng vai (không đáp trong vai), app hiện khung hỗ trợ soạn sẵn, không quay lại vai trong bài này.
 *   Khẩn cấp: như mọi chữ học sinh viết trong bài luyện (bài chuyển "Chuyển an toàn").
 */
export async function practiceRoleplay(id: string, text: string): Promise<PracticeResult> {
  const found = await own(id);
  if ("ok" in found) return found;
  const { profile, loaded } = found;
  const { session } = loaded;
  const said = String(text ?? "").replace(/\s+/g, " ").trim().slice(0, LIMITS.roleplay);
  const spec = roleplayOf(session.skill);
  const blocked = roleplayBlocked(session.skill, { own: Boolean(session.own_situation), caseCode: session.case_code });
  if (!spec || blocked) return { ok: false, error: blocked ?? "Tập nói chưa có ở kỹ năng này." };
  const partner = spec.kind === "teacher" ? "thầy cô" : spec.persona;
  if (said.length < 2) return { ok: false, error: `Bạn nói một câu với ${partner} nhé.` };
  const latest = [...loaded.attempts].sort((a, b) => b.version - a.version)[0];
  if (!latest || (session.step !== "G" && session.step !== "N")) {
    return { ok: false, error: spec.kind === "teacher" ? "Viết lời nhờ trước rồi tập nói nhé." : "Lưu bài trước rồi tập nói nhé." };
  }
  if (roleplayStopped(session.ai_uses)) return { ok: false, error: "Phần tập nói của bài này đã dừng. Bạn vẫn làm tiếp các bước khác được." };
  if (!aiAllowed("roleplay", session.ai_uses, session.state) || session.state === "completed") return { ok: false, error: "Bài này đã tập nói đủ lượt rồi." };

  const gate = await safetyCheck(profile, said, loaded, session.skill);
  if (gate.crisis) return gate.crisis;
  const situation = situationOf(session).text;

  if (spec.kind === "teacher") {
    const turns: RoleplayTurn[] = [...readTurns(latest.roleplay), { role: "student", text: said }];
    const reply = await roleplayReply({ situation, request: latest.answers.request ?? "", turns });
    turns.push({ role: "teacher", text: reply ?? TEACHER_FALLBACK });
    if (!(await updateAttempt(profile.id, id, latest.version, { roleplay: turns }))) return { ok: false, error: SAVE_FAILED };
    await updateSession(profile.id, id, { ai_uses: usesWith(loaded, "roleplay") });
    return done(profile, id);
  }

  // vai bạn cùng lớp: lượt đầu lưu kèm câu mở đầu (bạn trong vai nói trước) để đọc lại đủ cuộc tập nói
  const prior = readTurns(latest.roleplay);
  const opening = roleplayOpening(session.skill, session.case_code);
  const turns: RoleplayTurn[] = [...(prior.length || !opening ? prior : [{ role: "partner" as const, text: opening }]), { role: "student", text: said }];
  const reply = gate.concern ? null : await partnerReply({ skill: session.skill, situation, turns });
  const stop = gate.concern || (reply !== null && "outOfRole" in reply);
  if (!stop) {
    const last = turns.filter((t) => t.role === "student").length >= spec.maxTurns;
    turns.push({ role: "partner", text: reply && "text" in reply ? reply.text : last ? spec.fallbackEnd : spec.fallback });
  }
  if (!(await updateAttempt(profile.id, id, latest.version, { roleplay: turns }))) return { ok: false, error: SAVE_FAILED };
  await updateSession(profile.id, id, { ai_uses: stop ? { ...session.ai_uses, roleplay: ROLEPLAY_STOPPED } : usesWith(loaded, "roleplay") });
  return done(profile, id);
}

// ───────── Nhìn lại và xong ─────────

/**
 * Học sinh bấm "Mình đã làm xong". Chỉ "Hoàn thành" khi đủ ô bắt buộc (máy chủ kiểm tra) và chính học sinh bấm.
 * `nextTry`: một việc sẽ thử thật (không bắt buộc); có thì trợ lý đáp một câu.
 */
export async function finishPractice(id: string, nextTry: string | null): Promise<PracticeResult<{ reaction: string | null }>> {
  const found = await own(id);
  if ("ok" in found) return found;
  const { profile, loaded } = found;
  const skill = loaded.session.skill;
  const tryText = nextTry ? String(nextTry).replace(/\s+/g, " ").trim().slice(0, LIMITS.nextTry) : "";
  const t = transition(toSnapshot(loaded), { type: "confirm" }, "student");
  if (!t.ok) {
    const missing = t.reason === "Còn ô bắt buộc chưa viết";
    return { ok: false, error: missing ? "Bài còn thiếu ô bắt buộc nên chưa tính là xong. Bạn có thể dừng ở đây, bài vẫn được giữ." : t.reason, view: viewOf(loaded) };
  }
  if (tryText.length >= 2) {
    const crisis = await safetyGate(profile, tryText, loaded, skill);
    if (crisis) return crisis;
  }
  const canReact = tryText.length >= 2 && aiAllowed("reaction", loaded.session.ai_uses, loaded.session.state);
  const reaction = canReact ? await reviewReaction(skill, tryText) : null;
  const extra = { ...(tryText.length >= 2 ? { next_try: tryText } : {}), ...(canReact ? { ai_uses: usesWith(loaded, "reaction") } : {}) };
  if (!(await saveSnapshot(profile.id, id, t.next, extra))) return { ok: false, error: SAVE_FAILED };
  void recordPracticeMeasure(profile.id, "practice_completed", skill);
  logActivity(profile, "practice_complete", skill);
  revalidatePath("/luyen");
  return done(profile, id, { reaction });
}

/** Học sinh tự xóa một bài luyện (cả lần 1, lần 2 và góp ý). */
export async function deletePractice(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const found = await own(id);
  if ("ok" in found) return found;
  if (!(await removeSession(found.profile.id, id))) return { ok: false, error: SAVE_FAILED };
  revalidatePath("/luyen");
  return { ok: true };
}
