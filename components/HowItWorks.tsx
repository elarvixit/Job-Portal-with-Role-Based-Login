import Link from 'next/link';
import type { Role } from '@/lib/types';
import { ArrowRight, BriefcaseIcon, UserIcon } from './icons';

const CANDIDATE_STEPS = [
  { t: 'Sign up and complete your profile', d: 'Add your phone, skills, years of experience and a PDF resume (up to 2 MB).' },
  { t: 'Find a role you like', d: 'Search by job title and filter by location or skill. Each job shows how well your skills match.' },
  { t: 'Apply once, before the deadline', d: 'Write a short cover note; your profile and resume are sent with it.' },
  { t: 'Track your progress', d: 'My Applications shows every step: Applied → Shortlisted → Interview → Offered, and you get a notification each time.' },
];

const RECRUITER_STEPS = [
  { t: 'Create a recruiter account', d: 'Choose “Recruiter” when you sign up — recruiters get their own dashboard.' },
  { t: 'Post a job', d: 'Add the title, company, location, salary, required skills, description and a deadline.' },
  { t: 'Review applicants', d: 'See each candidate’s profile, skill match %, cover note and PDF resume. You only see your own jobs.' },
  { t: 'Update the status', d: 'Move candidates to Shortlisted, Interview, Offered or Rejected. Every change is logged with a timestamp.' },
];

/** Home page explainer for both kinds of user. The buttons adapt to who is logged in. */
export default function HowItWorks({ role }: { role: Role | null }) {
  return (
    <section className="hiw" aria-labelledby="hiw-title">
      <div className="container">
        <div className="hiw-head" data-reveal>
          <div className="eyebrow">How it works</div>
          <h2 id="hiw-title">
            One portal, <span className="serif">two sides</span>
          </h2>
          <p>Candidates apply and track their progress. Recruiters post jobs and manage applicants. Here’s how each works.</p>
        </div>

        <div className="hiw-grid">
          <article className="hiw-card" data-reveal>
            <div className="who">
              <span className="ico ico-accent">
                <UserIcon size={20} />
              </span>
              <div>
                <h3>For candidates</h3>
                <p>Looking for your next job</p>
              </div>
            </div>
            <ol className="hiw-steps">
              {CANDIDATE_STEPS.map((s, i) => (
                <li key={s.t} style={{ ['--d' as string]: i }}>
                  <span className="n">{i + 1}</span>
                  <div>
                    <strong>{s.t}</strong>
                    <span>{s.d}</span>
                  </div>
                </li>
              ))}
            </ol>
            <div className="cta">
              {role === 'candidate' ? (
                <>
                  <Link href="/#jobs" className="btn btn-primary">
                    Browse jobs <ArrowRight size={16} />
                  </Link>
                  <Link href="/candidate/applications" className="btn btn-secondary">
                    My Applications
                  </Link>
                </>
              ) : role === 'recruiter' ? (
                <span className="muted" style={{ fontSize: 13.5 }}>
                  Candidates use a separate account to apply.
                </span>
              ) : (
                <>
                  <Link href="/signup?role=candidate" className="btn btn-primary">
                    Sign up as a candidate <ArrowRight size={16} />
                  </Link>
                  <Link href="/#jobs" className="btn btn-secondary">
                    Browse jobs
                  </Link>
                </>
              )}
            </div>
          </article>

          <article className="hiw-card recruiter" data-reveal>
            <div className="who">
              <span className="ico ico-violet">
                <BriefcaseIcon size={20} />
              </span>
              <div>
                <h3>For recruiters</h3>
                <p>Hiring for your team</p>
              </div>
            </div>
            <ol className="hiw-steps">
              {RECRUITER_STEPS.map((s, i) => (
                <li key={s.t} style={{ ['--d' as string]: i + 2 }}>
                  <span className="n">{i + 1}</span>
                  <div>
                    <strong>{s.t}</strong>
                    <span>{s.d}</span>
                  </div>
                </li>
              ))}
            </ol>
            <div className="cta">
              {role === 'recruiter' ? (
                <>
                  <Link href="/recruiter/jobs/new" className="btn btn-primary">
                    Post a job <ArrowRight size={16} />
                  </Link>
                  <Link href="/recruiter/jobs" className="btn btn-secondary">
                    My Jobs
                  </Link>
                </>
              ) : role === 'candidate' ? (
                <span className="muted" style={{ fontSize: 13.5 }}>
                  Recruiters use a separate account to post jobs.
                </span>
              ) : (
                <Link href="/signup?role=recruiter" className="btn btn-dark">
                  Sign up as a recruiter <ArrowRight size={16} />
                </Link>
              )}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
