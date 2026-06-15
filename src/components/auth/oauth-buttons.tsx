"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/locale-provider";

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.69-2.26 1.1-3.71 1.1-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.14a6.6 6.6 0 0 1 0-4.28V7.02H2.18a11 11 0 0 0 0 9.96l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.97 10.97 0 0 0 12 1a10.99 10.99 0 0 0-9.82 6.02l3.66 2.84c.87-2.6 3.3-4.48 6.16-4.48z"
      />
    </svg>
  );
}

function LineIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="#06C755" aria-hidden="true">
      <path d="M12 2C6.48 2 2 5.66 2 10.2c0 4.06 3.58 7.46 8.42 8.1.33.07.78.22.89.5.1.26.07.66.03.92l-.14.86c-.04.26-.2 1.01.88.55 1.08-.46 5.84-3.44 7.97-5.89C21.5 13.16 22 11.74 22 10.2 22 5.66 17.52 2 12 2zm-3.87 9.99h-1.4c-.2 0-.37-.17-.37-.37V8.04c0-.2.17-.37.37-.37s.37.17.37.37v3.21h1.03c.2 0 .37.17.37.37s-.17.37-.37.37zm1.95 0c-.2 0-.37-.17-.37-.37V8.04c0-.2.17-.37.37-.37s.37.17.37.37v3.58c0 .2-.17.37-.37.37zm4.43 0c-.16 0-.29-.06-.36-.18l-1.74-2.36v2.17c0 .2-.16.37-.37.37-.2 0-.37-.17-.37-.37V8.04c0-.16.1-.3.25-.35a.36.36 0 0 1 .42.13l1.74 2.36V8.04c0-.2.16-.37.37-.37.2 0 .37.17.37.37v3.58c0 .16-.11.3-.26.35a.4.4 0 0 1-.05.02zm3.61-2.94h-1.4v.85h1.4c.2 0 .37.17.37.37s-.17.37-.37.37h-1.4v.65h1.4c.2 0 .37.17.37.37s-.17.37-.37.37h-1.77c-.2 0-.37-.17-.37-.37V8.04c0-.2.17-.37.37-.37h1.77c.2 0 .37.17.37.37s-.17.37-.37.37z" />
    </svg>
  );
}

export function OAuthButtons() {
  const { t } = useLocale();
  const [loading, setLoading] = React.useState<"google" | "line" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function handleOAuth(provider: "google" | "line") {
    if (!SUPABASE_CONFIGURED) {
      setError(
        "Supabase isn't configured yet, so social login is disabled in demo mode."
      );
      return;
    }
    setError(null);
    setLoading(provider);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      // LINE is wired as a custom OIDC provider in Supabase (see .env.example).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      provider: provider as any,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={loading !== null}
          onClick={() => handleOAuth("google")}
        >
          <GoogleIcon />
          <span className="ml-2">{loading === "google" ? "..." : "Google"}</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={loading !== null}
          onClick={() => handleOAuth("line")}
        >
          <LineIcon />
          <span className="ml-2">{loading === "line" ? "..." : "LINE"}</span>
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="sr-only">
        {t("auth.continueWithGoogle")} / {t("auth.continueWithLine")}
      </p>
    </div>
  );
}
