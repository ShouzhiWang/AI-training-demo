import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <main className="auth-page compact">
      <section className="auth-panel">
        <div className="auth-card">
          <span className="brand-mark auth-error-mark">m</span>
          <h2>We couldn’t complete sign-in</h2>
          <p>The email link may have expired or already been used. Request a new one and try again.</p>
          <Link className="auth-submit" href="/login">Return to sign in</Link>
        </div>
      </section>
    </main>
  );
}
