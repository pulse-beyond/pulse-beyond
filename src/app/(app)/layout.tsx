import { AppSidebar } from "@/components/app-sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen md:overflow-hidden">
      <AppSidebar />
      <div className="flex-1 min-w-0 overflow-y-auto pt-14 md:pt-0">
        <main className="px-4 py-6 md:px-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}
