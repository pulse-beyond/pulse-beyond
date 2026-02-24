"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Lightbulb, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/create",
    label: "Create",
    icon: PenLine,
    matchPaths: ["/create", "/issues"],
    badge: null,
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: BarChart3,
    matchPaths: ["/analytics"],
    badge: "New",
  },
  {
    href: "/brain-dump",
    label: "Brain Dump",
    icon: Lightbulb,
    matchPaths: ["/brain-dump"],
    badge: "New",
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Navigation
      </p>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = item.matchPaths.some((path) =>
          pathname.startsWith(path)
        );

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors w-full",
              isActive
                ? "bg-sidebar-active text-foreground font-medium"
                : "text-muted-foreground hover:bg-sidebar-hover hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
