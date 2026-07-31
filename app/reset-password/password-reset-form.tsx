"use client";

import { FormEvent, useState } from "react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function PasswordResetForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setIsComplete(true);
  }

  if (isComplete) {
    return (
      <div className="password-reset-success">
        <CheckCircleIcon />
        <h2>Password updated</h2>
        <p>Your new password is ready. You can continue to your workspace.</p>
        <button className="auth-submit" onClick={() => router.replace("/")} type="button">
          Continue to Muse
        </button>
      </div>
    );
  }

  return (
    <>
      <h2>Choose a new password</h2>
      <p>Use at least eight characters and keep it somewhere safe.</p>
      <form className="auth-form" onSubmit={submit}>
        <label>
          <span>New password</span>
          <div className="auth-input">
            <LockClosedIcon />
            <input
              autoComplete="new-password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              required
              type="password"
              value={password}
            />
          </div>
        </label>
        <label>
          <span>Confirm password</span>
          <div className="auth-input">
            <LockClosedIcon />
            <input
              autoComplete="new-password"
              minLength={8}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="Enter it again"
              required
              type="password"
              value={confirmation}
            />
          </div>
        </label>
        <button className="auth-submit" disabled={isLoading} type="submit">
          {isLoading && <ArrowPathIcon className="auth-spinner" />}
          {isLoading ? "Updating…" : "Update password"}
        </button>
      </form>
      {error && <p className="auth-error" role="alert">{error}</p>}
    </>
  );
}
