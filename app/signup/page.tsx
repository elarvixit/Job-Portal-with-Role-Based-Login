import type { Metadata } from 'next';
import Link from 'next/link';
import AuthArt from '@/components/AuthArt';
import SignupForm from '@/components/SignupForm';

export const metadata: Metadata = { title: 'Sign up' };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  const defaultRole = role === 'recruiter' ? 'recruiter' : 'candidate';
  return (
    <div className="auth">
      <AuthArt heading="Your next chapter" accent="starts here." />
      <div className="auth-panel">
        <div className="auth-card fade-up">
          <h1>Create your account</h1>
          <p className="sub">Join thousands of candidates and recruiters on Hireloom.</p>
          <SignupForm defaultRole={defaultRole} />
          <p className="auth-foot">
            Already have an account? <Link href="/login">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
