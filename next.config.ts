import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // F-Mood gần như trang nào cũng cần đăng nhập và dữ liệu riêng của học sinh,
  // nên dùng chế độ render động mặc định thay vì Cache Components.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // lúc build và mã commit lúc build (Vercel), để trang thầy cô ghi đúng bản dùng thử đang chạy (lib/version.ts, P0 khóa phiên bản)
  env: {
    FMOOD_BUILD_TIME: new Date().toISOString(),
    FMOOD_GIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? "",
    FMOOD_GIT_REF: process.env.VERCEL_GIT_COMMIT_REF ?? "",
  },
  // thư viện đọc PDF chạy trực tiếp trên Node, không đóng gói
  serverExternalPackages: ["unpdf"],
  experimental: {
    // Quay lại một trang vừa mở trong 30 giây thì trình duyệt hiện ngay bản đã có, không hỏi lại máy chủ (01/11).
    // Mọi thao tác ghi dữ liệu qua server action có revalidatePath sẽ xóa bộ nhớ này, nên học sinh không thấy số cũ sau khi lưu.
    // Riêng tin nhắn chat (/api/chat) không xóa: trong tối đa 30 giây, trang vừa xem trước đó có thể chưa có thay đổi từ cuộc trò chuyện.
    staleTimes: { dynamic: 30 },
  },
  // Không in tham số server action ra terminal: trong đó có mật khẩu và
  // cảm xúc của học sinh (Next.js mặc định in khi chạy dev).
  logging: {
    serverFunctions: false,
  },
  // Menu 4 mục (01/11, kế hoạch V2 mục 2.1): trang cũ chuyển sang trang mới. Dùng 307 (permanent: false) vì còn có thể
  // quay lại bản cũ; trình duyệt không lưu cache chuyển hướng tạm. /luyen/<kỹ năng> chuyển trong chính trang đó
  // (đọc mã cũ qua lib/sel/legacy.ts); /luyen/bai/<mã bài> và /library/<bài> giữ nguyên.
  redirects() {
    return [
      { source: "/luyen", destination: "/ky-nang", permanent: false },
      { source: "/library", destination: "/ky-nang", permanent: false },
      { source: "/me/hanh-trinh", destination: "/hanh-trinh", permanent: false },
    ];
  },
  // bài học và nội dung an toàn được đọc từ thư mục content/ lúc chạy
  outputFileTracingIncludes: {
    "/**": ["./content/**/*"],
  },
};

export default nextConfig;
