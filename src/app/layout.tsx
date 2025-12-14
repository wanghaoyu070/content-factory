import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import { Toaster } from "sonner";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "内容工厂 - AI驱动的内容创作平台",
  description: "选题分析、AI创作、多平台发布一站式解决方案",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
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
          {/* 跳到主内容链接 - 可访问性 */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:outline-none"
          >
            跳到主内容
          </a>
          <div className="flex min-h-screen">
            <Sidebar />
            <main id="main-content" className="flex-1 main-content pb-20 lg:pb-0" tabIndex={-1}>
              {children}
            </main>
          </div>
          <BottomNav />
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
