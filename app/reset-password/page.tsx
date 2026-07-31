import { redirect } from "next/navigation";
import { KeyIcon } from "@heroicons/react/24/outline";
import { PasswordResetForm } from "@/app/reset-password/password-reset-form";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function ResetPasswordPage() {
  if (!isSupabaseConfigured()) redirect("/login");

  const supabase = await createClient();
  const { data: verifiedToken } = await supabase.auth.getClaims();
  if (!verifiedToken?.claims?.sub) redirect("/login");

  return (
    <main className="auth-page compact">
      <section className="auth-panel">
        <div className="auth-card">
          <span className="auth-icon"><KeyIcon /></span>
          <PasswordResetForm />
        </div>
      </section>
    </main>
  );
}
