"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import Image from "next/image";

interface UserMenuProps {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export function UserMenu({ name, email, image }: UserMenuProps) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-3">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {image ? (
          <Image
            src={image}
            alt={name ?? "User"}
            width={32}
            height={32}
            className="rounded-full"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {name?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">
          {name ?? "Usuário"}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">{email}</p>
      </div>

      {/* Sign out */}
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex-shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-hover hover:text-foreground transition-colors"
        title="Sair"
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
