"use client";

import { useState } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";

export function GoogleSignInButton() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function signIn() {
    setError(null);
    setIsLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
    });

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
    }
  }

  return (
    <>
      <button
        className="google-sign-in"
        disabled={isLoading}
        onClick={signIn}
        type="button"
      >
        {isLoading ? <ArrowPathIcon className="auth-spinner" /> : <GoogleMark />}
        {isLoading ? "Opening Google…" : "Continue with Google"}
      </button>
      {error && <p className="auth-error" role="alert">{error}</p>}
    </>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.2h5.4a4.6 4.6 0 0 1-2 3v2.7h3.3c1.9-1.8 2.9-4.4 2.9-7.7Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.7c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.8A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.5 13.8A6 6 0 0 1 6.2 12c0-.6.1-1.2.3-1.8V7.4H3.1A10 10 0 0 0 2 12c0 1.7.4 3.2 1.1 4.6l3.4-2.8Z" />
      <path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2a10 10 0 0 0-8.9 5.4l3.4 2.8A5.9 5.9 0 0 1 12 6.1Z" />
    </svg>
  );
}
