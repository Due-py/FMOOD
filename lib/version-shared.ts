// NHÃN PHIÊN BẢN ĐANG CHẠY (P0 "Khóa phiên bản dùng thử", phản biện 31/10).
// Hàm thuần, chạy được ở test: đọc biến môi trường Vercel, dựng nhãn để thầy cô và nhóm biết 8A1 đang dùng đúng bản đã khóa.
// Phần đọc git ở máy và đọc mô hình AI trong cài đặt nằm ở lib/version.ts (chỉ máy chủ).

/** Tên bản dùng thử (Demo 2.2 cho đợt thử 03–12/11, Duy chọn 01/11); đổi bằng biến FMOOD_VERSION_NAME khi sang Demo 3 (nhánh riêng). */
export const DEFAULT_VERSION_NAME = "Demo 2.2";

export type BuildInfo = {
  name: string;
  /** mã commit ngắn (7 ký tự) */
  commit: string | null;
  branch: string | null;
  /** lúc build (ISO), ghi trong next.config.ts; trên Vercel build = triển khai */
  builtAt: string | null;
  /** production / preview / development (Vercel), hoặc "may" khi chạy ở máy */
  env: string | null;
  source: "vercel" | "git" | "unknown";
};

type Env = Record<string, string | undefined>;

const short = (sha: string | undefined) => (sha ? sha.trim().slice(0, 7) || null : null);

/** Thông tin build lấy từ biến môi trường Vercel. Không chạy trên Vercel thì source = "unknown". */
export function buildInfoFromEnv(env: Env): BuildInfo {
  const name = env.FMOOD_VERSION_NAME?.trim() || DEFAULT_VERSION_NAME;
  const builtAt = env.FMOOD_BUILD_TIME && !Number.isNaN(Date.parse(env.FMOOD_BUILD_TIME)) ? env.FMOOD_BUILD_TIME : null;
  const commit = short(env.VERCEL_GIT_COMMIT_SHA);
  if (commit) {
    return { name, commit, branch: env.VERCEL_GIT_COMMIT_REF?.trim() || null, builtAt, env: env.VERCEL_ENV?.trim() || null, source: "vercel" };
  }
  return { name, commit: null, branch: null, builtAt, env: null, source: "unknown" };
}

/**
 * Ghép kết quả `git describe --always --dirty` (chỉ dùng ở máy khi chạy dev) vào thông tin build.
 * Ví dụ "5dfc05d-dirty": "-dirty" nghĩa là có sửa chưa lưu phiên bản, nhãn ghi "+sua" như các bộ thử.
 */
export function withGitDescribe(info: BuildInfo, describe: string | null, branch: string | null): BuildInfo {
  const d = describe?.trim();
  if (!d) return info;
  const dirty = d.endsWith("-dirty");
  const base = dirty ? d.slice(0, -"-dirty".length) : d;
  // dạng "v1.0-3-gabc1234" thì lấy mã sau "g"; dạng "abc1234" thì lấy nguyên
  const sha = /-g([0-9a-f]{7,})$/.exec(base)?.[1] ?? base;
  return { ...info, commit: `${sha.slice(0, 7)}${dirty ? "+sua" : ""}`, branch: branch?.trim() || null, env: "may", source: "git" };
}

/** Giờ Việt Nam, dạng 01/11/2026 20:15. */
function formatTime(iso: string): string {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false,
  }).formatToParts(new Date(iso));
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? "00";
  return `${v("day")}/${v("month")}/${v("year")} ${v("hour")}:${v("minute")}`;
}

/** Một dòng nhãn phiên bản, ví dụ "Demo 2.1 · mã 5dfc05d (nhánh main) · triển khai 01/11/2026 20:15". */
export function versionLabel(info: BuildInfo): string {
  const parts = [info.name];
  if (info.commit) parts.push(`mã ${info.commit}${info.branch ? ` (nhánh ${info.branch})` : ""}`);
  else parts.push("mã chưa rõ");
  if (info.builtAt) parts.push(`${info.source === "vercel" ? "triển khai" : "chạy từ"} ${formatTime(info.builtAt)}`);
  if (info.env && info.env !== "production") parts.push(info.env === "may" ? "bản ở máy" : `bản ${info.env}`);
  return parts.join(" · ");
}

/** Dòng mô hình AI đang cài (đọc từ cài đặt "ai.models"). */
export function modelsLabel(models: { chat: string; safety: string }): string {
  return `mô hình trò chuyện ${models.chat}, an toàn ${models.safety}`;
}
