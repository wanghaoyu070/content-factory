import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import { Toaster } from "sonner";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "内容工厂 - AI驱动的内容创作平台",
  description: "选题分析、AI创作、多平台发布一站式解决方案",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 main-content">
              {children}
            </main>
          </div>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#16162a",
                border: "1px solid #2d2d44",
                color: "#e2e8f0",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
