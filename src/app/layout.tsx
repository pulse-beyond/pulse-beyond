import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pulse Beyond",
  description: "Build your weekly LinkedIn newsletter in a repeatable workflow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex h-screen overflow-hidden">
          <AppSidebar />
          <div className="flex-1 min-w-0 overflow-y-auto">
            <main className="px-6 py-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
