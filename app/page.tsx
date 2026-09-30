import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { listOpenJobs } from '@/lib/repo';
import { isPastDeadline } from '@/lib/rules';
import { JOB_TYPES } from '@/lib/types';
import HowItWorks from '@/components/HowItWorks';
import { CountUp, EmptyState, JobCard } from '@/components/ui';
import { BriefcaseIcon, CheckIcon, PinIcon, SearchIcon, SparkIcon, StarIcon } from '@/components/icons';

type SP = { q?: string; location?: string; type?: string; skill?: string };

function buildHref(sp: SP, patch: Partial<SP>) {
  const merged = { ...sp, ...patch };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
  const qs = params.toString();
  return qs ? `/?${qs}#jobs` : '/#jobs';
}

export default async function HomePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const location = sp.location ?? '';
  const type = sp.type ?? '';
  const skill = sp.skill ?? '';

  const [openJobs, user] = await Promise.all([listOpenJobs(), getCurrentUser()]);
  const locations = [...new Set(openJobs.map((j) => j.location))].sort((a, b) =>
    a === 'Remote' ? -1 : b === 'Remote' ? 1 : a.localeCompare(b),
  );
  // Every skill any open job asks for, most requested first.
  const skillCounts = new Map<string, number>();
  for (const j of openJobs) for (const sk of j.skills) skillCounts.set(sk, (skillCounts.get(sk) ?? 0) + 1);
  const allSkills = [...skillCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([sk]) => sk);

  // Search by job title (or company); filter by location, skill and job type.
  const needle = q.toLowerCase();
  const hasSkill = (j: (typeof openJobs)[number]) => !skill || j.skills.some((x) => x.toLowerCase() === skill.toLowerCase());
  const matchesQL = openJobs.filter(
    (j) =>
      (!needle || j.title.toLowerCase().includes(needle) || j.company.toLowerCase().includes(needle)) &&
      (!location || j.location === location) &&
      hasSkill(j),
  );
  // Jobs still accepting applications first; ones past their deadline last.
  const jobs = matchesQL
    .filter((j) => !type || j.type === type)
    .sort((a, b) => Number(isPastDeadline(a)) - Number(isPastDeadline(b)));

  const accepting = openJobs.filter((j) => !isPastDeadline(j));
  const companies = new Set(openJobs.map((j) => j.company)).size;
  const hasFilters = Boolean(q || location || type || skill);

  return (
    <>
      <section className="hero">
        <span className="hero-orb o1" aria-hidden />
        <span className="hero-orb o2" aria-hidden />
        <span className="hero-orb o3" aria-hidden />
        <div className="container hero-grid">
          <HeroVisual />
          <div className="hero-copy">
          <div className="hero-eyebrow fade-up">
            <span className="pulse" /> {accepting.length} open roles hiring now
          </div>
          <h1 className="fade-up">
            Find work that <span className="serif">fits your life,</span> not the other way around.
          </h1>
          <p className="hero-sub fade-up">
            Hand-picked roles from ambitious teams. Apply in minutes, track every application, and hear back faster.
          </p>

          <form className="search fade-up" action="/" method="get" role="search">
            <label className="search-field">
              <SearchIcon />
              <span className="sr-only">Keyword</span>
              <input name="q" defaultValue={q} placeholder="Search by job title" autoComplete="off" />
            </label>
            <label className="search-field">
              <PinIcon />
              <span className="sr-only">Location</span>
              <select name="location" defaultValue={location}>
                <option value="">Any location</option>
                {locations.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="search-field">
              <SparkIcon />
              <span className="sr-only">Skill</span>
              <select name="skill" defaultValue={skill}>
                <option value="">Any skill</option>
                {allSkills.map((sk) => (
                  <option key={sk} value={sk}>
                    {sk}
                  </option>
                ))}
              </select>
            </label>
            <label className="search-field">
              <BriefcaseIcon />
              <span className="sr-only">Job type</span>
              <select name="type" defaultValue={type}>
                <option value="">Any job type</option>
                {JOB_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn btn-primary" type="submit">
              Search jobs
            </button>
          </form>

          <div className="hero-stats fade-up">
            <div>
              <strong>
                <CountUp value={openJobs.length} />
              </strong>
              open positions
            </div>
            <div>
              <strong>
                <CountUp value={companies} />
              </strong>
              hiring companies
            </div>
            <div>
              <strong>
                <CountUp value={locations.length} />
              </strong>
              locations
            </div>
          </div>
          </div>
        </div>
      </section>

      <section className="section" id="jobs">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>{hasFilters ? 'Matching roles' : 'Latest openings'}</h2>
              <p>
                {jobs.length} {jobs.length === 1 ? 'role' : 'roles'}
                {q && (
                  <>
                    {' '}
                    for “<strong style={{ color: 'var(--ink)' }}>{q}</strong>”
                  </>
                )}
                {location && <> in {location}</>}
                {skill && <> needing {skill}</>}
              </p>
            </div>
            {hasFilters && (
              <Link href="/#jobs" className="btn btn-ghost btn-sm">
                Clear all filters
              </Link>
            )}
          </div>

          <div className="filter-bar" aria-label="Filter by job type">
            <Link href={buildHref(sp, { type: '' })} className={`pill${!type ? ' active' : ''}`}>
              All types <span className="count">{matchesQL.length}</span>
            </Link>
            {JOB_TYPES.map((t) => (
              <Link key={t} href={buildHref(sp, { type: t })} className={`pill${type === t ? ' active' : ''}`}>
                {t} <span className="count">{matchesQL.filter((j) => j.type === t).length}</span>
              </Link>
            ))}
            <span className="sep" />
            <Link href={buildHref(sp, { location: location === 'Remote' ? '' : 'Remote' })} className={`pill${location === 'Remote' ? ' active' : ''}`}>
              <PinIcon size={14} /> Remote only
            </Link>
            {allSkills.slice(0, 5).map((sk) => (
              <Link key={sk} href={buildHref(sp, { skill: skill === sk ? '' : sk })} className={`pill${skill === sk ? ' active' : ''}`}>
                <SparkIcon size={13} /> {sk}
              </Link>
            ))}
          </div>

          {jobs.length ? (
            <div className="job-grid">
              {jobs.map((job, i) => (
                <JobCard key={job.id} job={job} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<SearchIcon size={22} />}
              title="No roles match your search"
              action={
                <Link href="/#jobs" className="btn btn-secondary">
                  Reset filters
                </Link>
              }
            >
              Try a broader keyword, a different location, or clearing the job type filter.
            </EmptyState>
          )}
        </div>
      </section>

      <HowItWorks role={user?.role ?? null} />
    </>
  );
}

/** Floating cards in the hero that tell the story from both sides (desktop only). */
function HeroVisual() {
  return (
    <div className="hero-visual" aria-hidden>
      <div className="float-card c1">
        <div className="role-tag">Candidate applies</div>
        <div className="row">
          <span className="mini-pdf">PDF</span>
          <div>
            <div className="who">Priya_Sharma_CV.pdf</div>
            <div className="what">Senior Frontend Engineer</div>
          </div>
          <span className="tag" style={{ background: 'rgba(106,174,255,.18)', color: '#9fcbff' }}>
            Sent
          </span>
        </div>
      </div>
      <div className="float-card c2">
        <div className="role-tag">Recruiter reviews</div>
        <div className="row">
          <span className="avatar">PS</span>
          <div>
            <div className="who">New applicant</div>
            <div className="what">Opened resume · 2 min ago</div>
          </div>
          <span className="tag" style={{ background: 'rgba(247,192,74,.18)', color: '#ffd98a' }}>
            In review
          </span>
        </div>
      </div>
      <div className="float-card c3">
        <div className="role-tag">Candidate sees it instantly</div>
        <div className="row">
          <span className="avatar" style={{ background: 'linear-gradient(135deg,#3ddc9d,#1fb4aa)' }}>
            <StarIcon size={14} />
          </span>
          <div>
            <div className="who">You’re shortlisted!</div>
            <div className="what">Northwind Labs</div>
          </div>
          <span className="tag" style={{ background: 'rgba(61,220,157,.18)', color: '#7ef0c1' }}>
            <CheckIcon size={11} strokeWidth={3} />
          </span>
        </div>
      </div>
    </div>
  );
}
