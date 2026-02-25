import { Zap } from "lucide-react";
import { SidebarNav } from "@/components/sidebar-nav";
import { UserMenu } from "@/components/user-menu";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function AppSidebar() {
  const session = await getServerSession(authOptions);

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

      {/* User menu */}
      <div className="border-t">
        <UserMenu
          name={session?.user?.name}
          email={session?.user?.email}
          image={session?.user?.image}
        />
      </div>
    </aside>
  );
}
