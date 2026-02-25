"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Zap } from "lucide-react";
import { Suspense } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="w-full max-w-sm space-y-8 px-4">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <Zap className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Pulse Beyond</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Newsletter builder for Roberto
          </p>
        </div>
      </div>

      {/* Card */}
      <div className="rounded-xl border bg-card p-8 shadow-sm space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-lg font-semibold">Bem-vindo</h2>
          <p className="text-sm text-muted-foreground">
            Entre com sua conta Google para acessar
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error === "AccessDenied"
              ? "Acesso negado. Seu email não está autorizado."
              : "Ocorreu um erro ao fazer login. Tente novamente."}
          </div>
        )}

        {/* Google button */}
        <button
          onClick={() => signIn("google", { callbackUrl: "/create" })}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-input bg-background px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {/* Google SVG icon */}
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Entrar com Google
        </button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Acesso restrito a usuários autorizados
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
