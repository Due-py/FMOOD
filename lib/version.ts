import "server-only";
import { execSync } from "node:child_process";
import { getSetting } from "@/lib/settings";
import { buildInfoFromEnv, modelsLabel, versionLabel, withGitDescribe, type BuildInfo } from "./version-shared";

// NHÃN PHIÊN BẢN + MÔ HÌNH AI (P0 "Khóa phiên bản dùng thử"): hiện ở trang thầy cô "Hôm nay" và trang Tình trạng trợ lý.
// Trên Vercel: lấy mã commit, nhánh từ biến môi trường của Vercel. Ở máy (chạy dev): hỏi git một lần.
// Không bao giờ làm hỏng trang: lỗi gì cũng chỉ ra "mã chưa rõ".

let gitMemo: BuildInfo | null = null;

function buildInfo(): BuildInfo {
  // Các biến FMOOD_* được next.config.ts ghi vào lúc build (thay chữ trực tiếp), nên phải đọc đúng tên biến.
  // Mã commit: biến Vercel lúc chạy, không có thì dùng bản ghi lúc build.
  const info = buildInfoFromEnv({
    ...process.env,
    VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || process.env.FMOOD_GIT_SHA,
    VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF || process.env.FMOOD_GIT_REF,
    FMOOD_BUILD_TIME: process.env.FMOOD_BUILD_TIME,
  });
  if (info.source === "vercel" || process.env.NODE_ENV === "production") return info;
  if (gitMemo) return gitMemo;
  try {
    const opts = { encoding: "utf8" as const, stdio: ["ignore", "pipe", "ignore"] as ["ignore", "pipe", "ignore"], timeout: 2000 };
    const describe = execSync("git describe --always --dirty", opts);
    const branch = execSync("git rev-parse --abbrev-ref HEAD", opts);
    gitMemo = withGitDescribe(info, describe, branch);
  } catch {
    gitMemo = info;
  }
  return gitMemo;
}

export type VersionInfo = BuildInfo & { label: string; models: { chat: string; safety: string }; modelsLabel: string };

/** Nhãn phiên bản đang chạy và mô hình AI đang cài. Đọc cài đặt lỗi thì dùng mặc định (getSetting tự lo). */
export async function versionInfo(): Promise<VersionInfo> {
  const info = buildInfo();
  const models = await getSetting("ai.models");
  return { ...info, label: versionLabel(info), models, modelsLabel: modelsLabel(models) };
}
