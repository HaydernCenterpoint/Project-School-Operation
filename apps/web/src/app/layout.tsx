import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "Đại học Sao Đỏ | Cổng học tập",
  description: "Không gian học tập số của Đại học Sao Đỏ.",
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
      <body>{children}</body>
    </html>
  );
}
