import type { Metadata } from 'next';
import Link from 'next/link';
import AuthArt from '@/components/AuthArt';
import LoginForm from '@/components/LoginForm';

export const metadata: Metadata = { title: 'Log in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;

  return (
    <div className="auth">
      <AuthArt heading="Welcome back to" accent="better hiring." />
      <div className="auth-panel">
        <div className="auth-card fade-up">
          <h1>Log in</h1>
          <p className="sub">Pick up right where you left off.</p>
          {next && (
            <div className="alert alert-info" style={{ marginBottom: 20 }}>
              Please log in to continue.
            </div>
          )}
          <LoginForm next={next} />
          <p className="auth-foot">
            New to Hireloom? <Link href="/signup">Create an account</Link>
          </p>
          <div className="demo-box">
            <strong>Demo accounts</strong> (password <code>password123</code>)
            <br />
            Candidate: <code>priya@example.test</code> · Recruiter: <code>maya@northwind.test</code>
          </div>
        </div>
      </div>
    </div>
  );
}
