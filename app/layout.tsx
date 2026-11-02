import type { Metadata, Viewport } from "next";
import { Baloo_2, Be_Vietnam_Pro } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

// tiêu đề nét tròn, vui (Duy chọn 02/11 thay Bricolage Grotesque)
const display = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700", "800"],
});

const body = Be_Vietnam_Pro({
  variable: "--font-bevietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "F-Mood – Safe & Sound",
    template: "%s · F-Mood – Safe & Sound",
  },
  description: "Cảm xúc được lắng nghe, bản thân được thấu hiểu.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5efe6" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1726" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <head>
        <script
          type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body className="min-h-full font-sans">
        {children}
      </body>
    </html>
  );
}
