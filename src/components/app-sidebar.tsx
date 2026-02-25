"use client";

import { useState } from "react";
import { Zap, Menu, X } from "lucide-react";
import { SidebarNav } from "@/components/sidebar-nav";
import { UserMenu } from "@/components/user-menu";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

// ─── Shared sidebar content ───────────────────────────────────────────────────

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { data: session } = useSession();

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b px-4 py-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold text-foreground">
          Pulse Beyond
        </span>
        {/* Close button — mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors md:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto">
        <SidebarNav onClose={onClose} />
      </div>

      {/* User menu */}
      <div className="border-t">
        <UserMenu
          name={session?.user?.name}
          email={session?.user?.email}
          image={session?.user?.image}
        />
      </div>
    </>
  );
}

// ─── AppSidebar ───────────────────────────────────────────────────────────────

export function AppSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ── Mobile topbar ── */}
      <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center border-b bg-sidebar px-4 md:hidden">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex flex-1 items-center justify-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
            <Zap className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold">Pulse Beyond</span>
        </div>
        {/* Spacer to balance the hamburger button */}
        <div className="w-9" />
      </header>

      {/* ── Mobile overlay ── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile drawer ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-sidebar transition-transform duration-200 md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent onClose={() => setOpen(false)} />
      </aside>

      {/* ── Desktop sidebar (always visible) ── */}
      <aside className="hidden md:flex h-screen w-60 flex-shrink-0 flex-col border-r bg-sidebar">
        <SidebarContent />
      </aside>
    </>
  );
}
