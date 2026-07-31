"use client";

import { FormEvent, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  KeyIcon,
  LockClosedIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up" | "otp" | "forgot-password";
const OTP_LENGTH = 8;

const modeCopy: Record<AuthMode, { title: string; description: string }> = {
  "sign-in": {
    title: "Welcome back",
    description: "Sign in with your email and password to continue learning.",
  },
  "sign-up": {
    title: "Create your account",
    description: "Start a student workspace with your name, email, and password.",
  },
  otp: {
    title: "Email me a code",
    description: "Use a one-time code instead of a password.",
  },
  "forgot-password": {
    title: "Reset your password",
    description: "We’ll send a secure recovery link to your email address.",
  },
};

export function EmailAuthForm({ emailOtpEnabled }: { emailOtpEnabled: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setNotice(null);
    setOtp("");
    setOtpSent(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsLoading(true);

    try {
      const supabase = createClient();

      if (mode === "sign-in") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
        router.replace("/");
        router.refresh();
        return;
      }

      if (mode === "sign-up") {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
          },
        });
        if (authError) throw authError;
        if (data.session) {
          router.replace("/");
          router.refresh();
          return;
        }
        setNotice("Check your inbox to confirm your email, then return to sign in.");
        return;
      }

      if (mode === "otp") {
        if (!otpSent) {
          const { error: authError } = await supabase.auth.signInWithOtp({
            email,
            options: {
              shouldCreateUser: true,
              emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
            },
          });
          if (authError) throw authError;
          setOtpSent(true);
          setNotice("We sent a one-time code to your email.");
          return;
        }

        const { error: authError } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: "email",
        });
        if (authError) throw authError;
        router.replace("/");
        router.refresh();
        return;
      }

      const { error: authError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        },
      );
      if (authError) throw authError;
      setNotice("If an account exists for this email, a recovery link is on its way.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const copy = modeCopy[mode];

  return (
    <div className="email-auth">
      {mode !== "sign-in" && (
        <button
          className="auth-back"
          onClick={() => changeMode("sign-in")}
          type="button"
        >
          <ArrowLeftIcon /> Back to sign in
        </button>
      )}

      <h2>{copy.title}</h2>
      <p>{copy.description}</p>

      <form className="auth-form" onSubmit={submit}>
        {mode === "sign-up" && (
          <label>
            <span>Name</span>
            <div className="auth-input">
              <UserIcon />
              <input
                autoComplete="name"
                onChange={(event) => setName(event.target.value)}
                placeholder="Alex Lee"
                required
                type="text"
                value={name}
              />
            </div>
          </label>
        )}

        <label>
          <span>Email address</span>
          <div className="auth-input">
            <EnvelopeIcon />
            <input
              autoComplete="email"
              onChange={(event) => {
                setEmail(event.target.value);
                if (otpSent) {
                  setOtpSent(false);
                  setOtp("");
                }
              }}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </div>
        </label>

        {(mode === "sign-in" || mode === "sign-up") && (
          <label>
            <span>Password</span>
            <div className="auth-input">
              <LockClosedIcon />
              <input
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                required
                type="password"
                value={password}
              />
            </div>
          </label>
        )}

        {mode === "otp" && otpSent && (
          <label>
            <span>One-time code</span>
            <div className="auth-input">
              <KeyIcon />
              <input
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={OTP_LENGTH}
                minLength={OTP_LENGTH}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                pattern={`[0-9]{${OTP_LENGTH}}`}
                placeholder="00000000"
                required
                type="text"
                value={otp}
              />
            </div>
          </label>
        )}

        {mode === "sign-in" && (
          <button
            className="auth-text-link forgot-link"
            onClick={() => changeMode("forgot-password")}
            type="button"
          >
            Forgot password?
          </button>
        )}

        <button className="auth-submit" disabled={isLoading} type="submit">
          {isLoading && <ArrowPathIcon className="auth-spinner" />}
          {submitLabel(mode, otpSent, isLoading)}
        </button>
      </form>

      {notice && (
        <div className="auth-notice" role="status">
          <CheckCircleIcon />
          <span>{notice}</span>
        </div>
      )}
      {error && <p className="auth-error" role="alert">{error}</p>}

      {mode === "sign-in" && emailOtpEnabled && (
        <>
          <div className="auth-divider"><span>or</span></div>
          <button
            className="auth-secondary"
            onClick={() => changeMode("otp")}
            type="button"
          >
            <KeyIcon /> Email me a code
          </button>
        </>
      )}

      {mode === "sign-in" && (
        <p className="auth-switch">
          New to Muse?{" "}
          <button onClick={() => changeMode("sign-up")} type="button">
            Create an account
          </button>
        </p>
      )}

      {mode === "sign-up" && (
        <p className="auth-switch">
          Already have an account?{" "}
          <button onClick={() => changeMode("sign-in")} type="button">
            Sign in
          </button>
        </p>
      )}

      {mode === "otp" && otpSent && (
        <button
          className="auth-text-link auth-resend"
          disabled={isLoading}
          onClick={() => {
            setOtpSent(false);
            setOtp("");
            setNotice(null);
          }}
          type="button"
        >
          Send a new code
        </button>
      )}
    </div>
  );
}

function submitLabel(mode: AuthMode, otpSent: boolean, isLoading: boolean) {
  if (isLoading) return "Please wait…";
  if (mode === "sign-in") return "Sign in";
  if (mode === "sign-up") return "Create account";
  if (mode === "forgot-password") return "Send recovery link";
  return otpSent ? "Verify code" : "Send code";
}
