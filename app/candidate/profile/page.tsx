import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import { getProfile, listOpenJobs } from '@/lib/repo';
import { profileChecklist } from '@/lib/rules';
import ProfileForm from '@/components/ProfileForm';
import ResumeUpload from '@/components/ResumeUpload';
import { CheckIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'My Profile' };

export default async function ProfilePage() {
  const user = await requireRole('candidate');
  const [profile, jobs] = await Promise.all([getProfile(user.id), listOpenJobs()]);
  const checklist = profileChecklist(profile);

  // Suggest the skills open jobs ask for most often.
  const counts = new Map<string, number>();
  for (const j of jobs) for (const s of j.skills) counts.set(s, (counts.get(s) ?? 0) + 1);
  const suggestions = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);

  return (
    <div className="container">
      <div className="page-head">
        <div>
          <div className="eyebrow">Candidate</div>
          <h1>My Profile</h1>
          <p>Recruiters see this with every application you send. Complete it once, then apply in one click.</p>
        </div>
      </div>

      <div className="profile-layout">
        <div className="card">
          <div className="form-section">
            <h2>About you</h2>
            <p>Your skills are compared with each job’s required skills to show a match score.</p>
            <ProfileForm
              defaults={{
                name: user.name,
                email: user.email,
                phone: profile?.phone ?? '',
                skills: profile?.skills ?? [],
                yearsExperience: profile ? profile.yearsExperience : '',
              }}
              suggestions={suggestions}
            />
          </div>
          <div className="form-section">
            <h2>Resume</h2>
            <p>Uploaded once and attached to each application. Changing it later doesn’t change applications you’ve already sent.</p>
            <ResumeUpload
              current={profile?.resumePath ? { name: profile.resumeName ?? 'resume.pdf', size: profile.resumeSize ?? 0 } : null}
            />
          </div>
        </div>

        <aside className="card card-pad sticky completeness" aria-label="Profile completeness">
          <h2>{checklist.complete ? 'Ready to apply' : `${checklist.percent}% complete`}</h2>
          <div className="meter" aria-hidden>
            <span style={{ width: `${checklist.percent}%` }} />
          </div>
          <ul className="checklist">
            {checklist.items.map((i) => (
              <li key={i.key} className={i.done ? 'done' : ''}>
                <span className="tick">
                  <CheckIcon size={11} strokeWidth={3} />
                </span>
                {i.label}
              </li>
            ))}
          </ul>
          <p className="muted" style={{ fontSize: 13 }}>
            {checklist.complete
              ? 'Your profile is complete. You can apply to any open job.'
              : 'You can apply once every item above is ticked.'}
          </p>
        </aside>
      </div>
    </div>
  );
}
