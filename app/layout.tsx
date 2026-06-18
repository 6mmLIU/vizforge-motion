import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VizForge Motion",
  description: "把 CSV、JSON 和表格数据生成高级图表图片、动态 SVG 和可自动化调用的 API assets。"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
