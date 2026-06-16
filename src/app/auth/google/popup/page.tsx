"use client";

import { useEffect } from "react";

/**
 * Google OAuth popup callback page.
 * Opened as a popup by the Google sign-in button.
 * Reads the id_token from the URL hash and posts it back to the opener, then closes.
 */
export default function GooglePopupCallback() {
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const idToken = params.get("id_token");
    const error = params.get("error");

    if (error) {
      window.opener?.postMessage(
        { type: "google-oauth-error", error },
        window.location.origin
      );
      window.close();
      return;
    }

    if (idToken && window.opener) {
      window.opener.postMessage(
        { type: "google-id-token", idToken },
        window.location.origin
      );
      window.close();
    }
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground text-sm">Signing in with Google…</p>
    </div>
  );
}
