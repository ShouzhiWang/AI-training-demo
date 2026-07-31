import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <main className="auth-page compact">
      <section className="auth-panel">
        <div className="auth-card">
          <span className="brand-mark auth-error-mark">m</span>
          <h2>We couldn’t complete sign-in</h2>
          <p>The link may have expired or the Google provider may not be configured yet.</p>
          <Link className="google-sign-in" href="/login">Try again</Link>
        </div>
      </section>
    </main>
  );
}
