import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { SessionProvider } from "@/components/session-provider";

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
        <SessionProvider>
          <div className="flex h-screen md:overflow-hidden">
            <AppSidebar />
            <div className="flex-1 min-w-0 overflow-y-auto pt-14 md:pt-0">
              <main className="px-4 py-6 md:px-6 md:py-8">{children}</main>
            </div>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
