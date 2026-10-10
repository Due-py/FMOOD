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
  // thư viện đọc PDF chạy trực tiếp trên Node, không đóng gói
  serverExternalPackages: ["unpdf"],
  // Không in tham số server action ra terminal: trong đó có mật khẩu và
  // cảm xúc của học sinh (Next.js mặc định in khi chạy dev).
  logging: {
    serverFunctions: false,
  },
  // bài học và nội dung an toàn được đọc từ thư mục content/ lúc chạy
  outputFileTracingIncludes: {
    "/**": ["./content/**/*"],
  },
};

export default nextConfig;
