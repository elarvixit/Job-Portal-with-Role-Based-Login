import Link from 'next/link';
import { listOpenJobs } from '@/lib/repo';
import { JOB_TYPES } from '@/lib/types';
import { EmptyState, JobCard } from '@/components/ui';
import { BriefcaseIcon, PinIcon, SearchIcon } from '@/components/icons';

type SP = { q?: string; location?: string; type?: string };

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

  const openJobs = await listOpenJobs();
  const locations = [...new Set(openJobs.map((j) => j.location))].sort((a, b) =>
    a === 'Remote' ? -1 : b === 'Remote' ? 1 : a.localeCompare(b),
  );

  const needle = q.toLowerCase();
  const matchesQL = openJobs.filter(
    (j) =>
      (!needle || [j.title, j.company, j.description].some((f) => f.toLowerCase().includes(needle))) &&
      (!location || j.location === location),
  );
  const jobs = matchesQL.filter((j) => !type || j.type === type);

  const companies = new Set(openJobs.map((j) => j.company)).size;
  const hasFilters = Boolean(q || location || type);

  return (
    <>
      <section className="hero">
        <div className="container">
          <div className="hero-eyebrow fade-up">
            <span className="pulse" /> {openJobs.length} open roles hiring now
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
              <input name="q" defaultValue={q} placeholder="Job title, company or keyword" autoComplete="off" />
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
              <strong>{openJobs.length}</strong>open positions
            </div>
            <div>
              <strong>{companies}</strong>hiring companies
            </div>
            <div>
              <strong>{locations.length}</strong>locations
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
          </div>

          {jobs.length ? (
            <div className="job-grid">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
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
    </>
  );
}
