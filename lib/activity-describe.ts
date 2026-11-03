// Dịch mã ngắn của nhật ký hoạt động học sinh (cột ref) thành lời dễ đọc cho trang admin và file CSV.
// Duy 03/11: "ghi rõ hoạt động của học sinh", chọn KHÔNG chép lời học sinh viết (giữ lời hứa riêng tư trong app).
// Chỉ đọc mã: tên kỹ năng, tình huống, bước trò chuyện, lối vào, độ dài (số chữ). Hàm thuần, có test.
import { ADJUST_TIPS } from "@/lib/habits-shared";
import { USED_LABEL, isUsed } from "@/lib/practice/review";
import { MOVE_LABEL, type SelMove } from "@/lib/sel/engine";
import { readSubskill } from "@/lib/sel/legacy";
import { SKILLS, caseByCode, isSkillId, skillOfAction } from "@/lib/skills";
import { SOURCE_LABEL, type ConversationSource } from "@/lib/chat-source";

/** Mở bài luyện từ đâu (?from=… ở app/actions/practice.ts). */
const PRACTICE_FROM_LABEL: Record<string, string> = {
  chat: "từ trò chuyện",
  library: "từ bài đọc",
  journal: "từ nhật ký",
  checkin: "từ ghi tâm trạng",
  skills: "từ trang Luyện kỹ năng",
  home: "từ Hôm nay",
};

const HELP_TO: Record<string, string> = {
  teacher: "gửi thầy cô chủ nhiệm",
  counselor: "gửi phòng tham vấn",
  "can-giup-ngay": "Cần giúp ngay",
};

function skillName(code: string | undefined): string | null {
  const id = readSubskill(code);
  return id && isSkillId(id) ? `«${SKILLS[id].name}»` : null;
}

function caseLabel(code: string | undefined): string | null {
  const c = caseByCode(code);
  return c ? `tình huống ${c.code} · ${c.title ?? c.sign}` : code ? `tình huống ${code}` : null;
}

/** "c:ab12cd|14" → "cuộc trò chuyện #ab12cd · 14 chữ" */
function chatRef(ref: string): string {
  const parts: string[] = [];
  for (const p of ref.split("|")) {
    if (p.startsWith("c:")) parts.push(`cuộc trò chuyện #${p.slice(2)}`);
    else if (/^\d+$/.test(p)) parts.push(`${p} chữ`);
    else if (p in SOURCE_LABEL) parts.push(SOURCE_LABEL[p as ConversationSource].toLowerCase());
  }
  return parts.join(" · ");
}

/** Lời dễ đọc cho một dòng nhật ký; null khi không có gì thêm ngoài tên việc. */
export function describeActivity(kind: string, ref: string | null | undefined): string | null {
  if (!ref) return null;
  switch (kind) {
    case "practice_open": {
      const [skill, ...rest] = ref.split("|");
      const parts = [skillName(skill)];
      for (const p of rest) {
        if (p.startsWith("from:")) parts.push(PRACTICE_FROM_LABEL[p.slice(5)] ?? null);
        else if (p === "own") parts.push("tình huống tự kể");
        else parts.push(caseLabel(p));
      }
      return parts.filter(Boolean).join(" · ") || ref;
    }
    case "practice_submit":
    case "practice_feedback":
    case "practice_revise":
    case "practice_complete": {
      const [skill, words] = ref.split("|");
      return [skillName(skill), words && /^\d+$/.test(words) ? `${words} chữ` : null].filter(Boolean).join(" · ") || ref;
    }
    case "practice_followup":
      return isUsed(ref) ? USED_LABEL[ref] : ref === "next_time" ? "Chọn cách lần sau" : ref;
    case "sel_step":
      return MOVE_LABEL[ref as SelMove] ?? ref;
    case "chat_start":
    case "chat_message":
      return chatRef(ref) || ref;
    case "journal_write":
      return /^\d+$/.test(ref) ? `${ref} chữ` : ref;
    case "help_request":
      return HELP_TO[ref] ?? ref;
    case "action_done": {
      const skill = skillOfAction(ref);
      return skill ? `${ref} · ${skillName(skill)}` : ref;
    }
    case "habit_adjust":
      return ADJUST_TIPS.find((t) => t.kind === ref)?.title ?? ref;
    case "test_start":
    case "test_submit":
    case "survey_submit":
      return `phiếu #${ref}`;
    default:
      return ref;
  }
}

/** Số chữ (từ) trong một đoạn: chỉ để ghi độ dài, không giữ nội dung. */
export const wordCount = (text: string): number => (text.trim() ? text.trim().split(/\s+/).length : 0);
