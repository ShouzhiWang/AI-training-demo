import { redirect } from "next/navigation";
import { AcademicCapIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { EmailAuthForm } from "@/app/login/email-auth-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const configured = isSupabaseConfigured();
  const emailOtpEnabled =
    process.env.NEXT_PUBLIC_EMAIL_OTP_ENABLED === "true";

  if (configured) {
    const supabase = await createClient();
    const { data: verifiedToken } = await supabase.auth.getClaims();
    const claims = verifiedToken?.claims;
    if (claims?.sub) redirect("/");
  }

  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="auth-brand"><span className="brand-mark">m</span> muse</div>
        <div>
          <span className="auth-eyebrow">LEARN BY MAKING</span>
          <h1>Turn your ideas into projects with an AI mentor beside you.</h1>
          <p>Plan, create, test, and reflect—without worrying about setup or complicated tools.</p>
        </div>
        <div className="auth-promise">
          <SparklesIcon />
          <span><strong>Idea first</strong><small>Tell Muse what you want to create.</small></span>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <span className="auth-icon"><AcademicCapIcon /></span>
          {configured ? (
            <EmailAuthForm emailOtpEnabled={emailOtpEnabled} />
          ) : (
            <>
              <h2>Supabase setup required</h2>
              <p>Add the project’s public connection details to start using email authentication.</p>
              <div className="auth-config-note">
                Supabase credentials are not configured yet. Add them to
                <code>.env.local</code> to enable email sign-in.
              </div>
            </>
          )}
          <small className="auth-terms">By continuing, you agree to use AI thoughtfully and test what you create.</small>
        </div>
      </section>
    </main>
  );
}
