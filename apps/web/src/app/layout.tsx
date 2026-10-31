import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { BootSplash } from "@/components/BootSplash";
import { NavProgress } from "@/components/NavProgress";
import { AnimatedGradient } from "@/components/landing/AnimatedGradient";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Đại học Sao Đỏ | Cổng học tập",
    template: "%s | Đại học Sao Đỏ",
  },
  description:
    "Cổng học tập của sinh viên Đại học Sao Đỏ: lớp học, bài tập, phản hồi của giảng viên và trợ lý học tập AI.",
  icons: {
    icon: [{ url: "/sao-do-logo.png", type: "image/png" }],
    shortcut: ["/sao-do-logo.png"],
    apple: [{ url: "/sao-do-logo.png", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#071a34",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="vi"
      className={GeistSans.className}
      data-scroll-behavior="smooth"
    >
      <body>
        <AnimatedGradient />
        <a className="skip-link" href="#noi-dung">
          Bỏ qua đến nội dung chính
        </a>
        <BootSplash />
        <NavProgress />
        {children}
      </body>
    </html>
  );
}
