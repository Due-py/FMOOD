// BỘ THỬ AN TOÀN GỘP (hàm thuần, có test: safety-suite.test.ts): câu có sẵn trong mã (SAFETY_CASE_GROUPS) và câu thầy cô
// thêm trên trang Bộ thử (bảng eval_cases) thành MỘT danh sách, mỗi câu một lần, kèm "được thêm bởi".
// Trang Bộ thử và nút "Chạy" dùng chung danh sách này, nên số câu hiện trên trang luôn bằng số câu thật sự chạy.
import type { RiskLevel } from "@/lib/safety/keywords";
import type { SafetyCase, SafetyCaseGroup, Turn } from "./safety-cases";

export type DbCase = { id: string; input: string; expected: string; note: string | null; active: boolean; created_at: string };
/** Lần "Thêm câu thử" trong nhật ký thao tác (admin_audit): tên người thêm, 60 ký tự đầu của câu, lúc thêm. */
export type AddedLog = { actor_name: string | null; detail: string | null; created_at: string };

export type SuiteRow = {
  key: string;
  input: string;
  expected: RiskLevel;
  history: Turn[];
  /** nhóm (câu có sẵn) hoặc "Thầy cô thêm trên trang" */
  group: string;
  by: string;
  date: string;
  source: "ma" | "trang";
  /** câu thêm trên trang: id để đổi mức / xóa, đang bật hay tắt, ghi chú */
  dbId?: string;
  active?: boolean;
  note?: string | null;
  /** câu thêm trên trang trùng một câu có sẵn: hiện để biết, KHÔNG chạy lại */
  duplicate?: boolean;
};

const norm = (s: string) => s.normalize("NFC").trim().toLowerCase().replace(/\s+/g, " ");
const isLevel = (v: string): v is RiskLevel => v === "none" || v === "concern" || v === "urgent";
const vnDate = (iso: string) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));

/** 12 câu mẫu cài sẵn khi tạo cơ sở dữ liệu (migration 0003): cùng lúc tạo, không có trong nhật ký thao tác. */
export const SEEDED_LABEL = "Mẫu cài sẵn khi tạo cơ sở dữ liệu";

export function mergeSafetySuite(groups: SafetyCaseGroup[], dbCases: DbCase[], added: AddedLog[]): SuiteRow[] {
  const rows: SuiteRow[] = [];
  const builtIn = new Set<string>();
  let i = 0;
  for (const g of groups) {
    for (const [input, expected, history = []] of g.cases as SafetyCase[]) {
      i++;
      builtIn.add(norm(input));
      rows.push({ key: `co-san-${i}`, input, expected, history, group: g.label, by: g.by, date: g.date, source: "ma" });
    }
  }
  const firstAt = dbCases.length ? Math.min(...dbCases.map((c) => Date.parse(c.created_at))) : 0;
  for (const c of dbCases) {
    if (!isLevel(c.expected)) continue;
    const log = added
      .filter((a) => a.detail && norm(a.detail) === norm(c.input.slice(0, 60)))
      .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))[0];
    // câu cài sẵn: tạo cùng lúc với câu đầu tiên và không có ai "Thêm câu thử" trong nhật ký
    const seeded = !log && Math.abs(Date.parse(c.created_at) - firstAt) < 60_000;
    rows.push({
      key: `trang-${c.id}`,
      input: c.input,
      expected: c.expected,
      history: [],
      group: "Thầy cô thêm trên trang",
      by: log?.actor_name ?? (seeded ? SEEDED_LABEL : "Không rõ (thêm trước khi có nhật ký)"),
      date: vnDate(log?.created_at ?? c.created_at),
      source: "trang",
      dbId: c.id,
      active: c.active,
      note: c.note,
      duplicate: builtIn.has(norm(c.input)),
    });
  }
  return rows;
}

/** Câu sẽ chạy: mọi câu có sẵn + câu thêm trên trang đang bật và không trùng câu có sẵn. */
export const runnableRows = (rows: SuiteRow[]) => rows.filter((r) => r.source === "ma" || (r.active && !r.duplicate));
