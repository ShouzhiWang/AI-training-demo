import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const allowedTypes: EmailOtpType[] = [
  "email",
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const requestedType = url.searchParams.get("type");
  const requestedNext = url.searchParams.get("next");
  const type = allowedTypes.includes(requestedType as EmailOtpType)
    ? (requestedType as EmailOtpType)
    : null;
  const defaultNext = type === "recovery" ? "/reset-password" : "/";
  const next =
    requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : defaultNext;

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin), {
        headers: { "Cache-Control": "private, no-store" },
      });
    }
  }

  return NextResponse.redirect(new URL("/auth/auth-code-error", url.origin), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
