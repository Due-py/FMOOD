// Nhãn phiên bản dùng thử (P0 khóa phiên bản). Chạy: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildInfoFromEnv, DEFAULT_VERSION_NAME, modelsLabel, versionLabel, withGitDescribe } from "./version-shared";

test("trên Vercel: mã commit ngắn, nhánh, lúc triển khai", () => {
  const info = buildInfoFromEnv({
    VERCEL_GIT_COMMIT_SHA: "5dfc05d1234567890abcdef",
    VERCEL_GIT_COMMIT_REF: "main",
    VERCEL_ENV: "production",
    FMOOD_BUILD_TIME: "2026-11-01T13:15:00.000Z",
  });
  assert.equal(info.source, "vercel");
  assert.equal(info.commit, "5dfc05d");
  assert.equal(versionLabel(info), `${DEFAULT_VERSION_NAME} · mã 5dfc05d (nhánh main) · triển khai 01/11/2026 20:15`);
});

test("bản xem trước và tên bản đổi được", () => {
  const info = buildInfoFromEnv({ VERCEL_GIT_COMMIT_SHA: "abcdef0123", VERCEL_GIT_COMMIT_REF: "demo-3", VERCEL_ENV: "preview", FMOOD_VERSION_NAME: "Demo 3" });
  assert.equal(versionLabel(info), "Demo 3 · mã abcdef0 (nhánh demo-3) · bản preview");
});

test("ở máy: dùng git describe, có sửa chưa lưu thì ghi +sua; không có gì thì không lỗi", () => {
  const none = buildInfoFromEnv({});
  assert.equal(none.source, "unknown");
  assert.equal(versionLabel(none), `${DEFAULT_VERSION_NAME} · mã chưa rõ`);
  assert.equal(withGitDescribe(none, "5dfc05d-dirty\n", "main\n").commit, "5dfc05d+sua");
  assert.equal(withGitDescribe(none, "v2.0-3-g5dfc05d", "main").commit, "5dfc05d");
  assert.equal(versionLabel(withGitDescribe(none, "5dfc05d", "main")), `${DEFAULT_VERSION_NAME} · mã 5dfc05d (nhánh main) · bản ở máy`);
  assert.deepEqual(withGitDescribe(none, null, null), none);
  // thời gian sai định dạng thì bỏ qua
  assert.equal(buildInfoFromEnv({ FMOOD_BUILD_TIME: "không phải ngày" }).builtAt, null);
});

test("dòng mô hình AI", () => {
  assert.equal(modelsLabel({ chat: "gpt-5.4-mini", safety: "gpt-5.4" }), "mô hình trò chuyện gpt-5.4-mini, an toàn gpt-5.4");
});
