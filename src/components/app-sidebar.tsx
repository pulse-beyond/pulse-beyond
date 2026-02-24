import { Zap } from "lucide-react";
import { SidebarNav } from "@/components/sidebar-nav";

export function AppSidebar() {
  return (
    <aside className="flex h-screen w-60 flex-shrink-0 flex-col border-r bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b px-4 py-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold text-foreground">
          Pulse Beyond
        </span>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto">
        <SidebarNav />
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-3">
        <p className="text-[11px] text-muted-foreground">v0.1.0</p>
      </div>
    </aside>
  );
}
