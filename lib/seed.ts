// Demo data: loaded by `npm run db:seed` (scripts/seed.ts), written to supabase/seed.sql by
// `npm run db:seed-sql`, and used to create demo resumes on demand (demoResume).
import { hashPassword } from './password';
import type { Application, ApplicationStatus, Job, JobType, User } from './types';

export interface SeedData {
  users: User[];
  jobs: Job[];
  applications: Application[];
  files: { path: string; data: Buffer }[];
}

// Demo accounts — all use the password "password123" (see README).
const DEMO_PASSWORD = 'password123';

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000 - Math.floor(n * 3600000 * 1.7)).toISOString();
}

/** One line of a generated PDF: [font size, text, bold?]. */
type PdfLine = [number, string, boolean?];

/** Builds a small, valid single-page PDF so seeded applications have a viewable resume. */
function renderPdf(lines: PdfLine[]): Buffer {
  const esc = (s: string) =>
    s
      .replace(/[^\x20-\x7e]/g, '-') // Helvetica here is plain ASCII
      .replace(/[()\\]/g, '\\$&');
  let y = 740;
  const content = lines
    .map(([size, text, bold]) => {
      const op = `BT /${bold ? 'F2' : 'F1'} ${size} Tf 64 ${y} Td (${esc(text)}) Tj ET`;
      y -= size >= 18 ? size + 14 : bold ? size + 10 : size + 7;
      return op;
    })
    .join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(out));
    out += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

/** Demo rows without password hashes (hashing is slow, and demoResume() doesn't need it). */
function records(): Omit<SeedData, 'files'> {
  const user = (id: string, name: string, email: string, role: User['role'], age: number): User => ({
    id,
    name,
    email,
    passwordHash: '',
    role,
    createdAt: daysAgo(age),
  });

  const users: User[] = [
    user('usr_recruiter1', 'Maya Chen', 'maya@northwind.test', 'recruiter', 60),
    user('usr_recruiter2', 'Arjun Rao', 'arjun@lumen.test', 'recruiter', 45),
    user('usr_candidate1', 'Priya Sharma', 'priya@example.test', 'candidate', 30),
    user('usr_candidate2', 'Daniel Okafor', 'daniel@example.test', 'candidate', 25),
    user('usr_candidate3', 'Sofia Martins', 'sofia@example.test', 'candidate', 20),
    user('usr_candidate4', 'Rahul Verma', 'rahul@example.test', 'candidate', 18),
    user('usr_candidate5', 'Aisha Khan', 'aisha@example.test', 'candidate', 15),
    user('usr_candidate6', 'Ethan Brooks', 'ethan@example.test', 'candidate', 12),
  ];

  const desc = (intro: string, resp: string[], reqs: string[], perks: string) =>
    `${intro}\n\nWhat you'll do\n${resp.map((r) => `• ${r}`).join('\n')}\n\nWhat we're looking for\n${reqs
      .map((r) => `• ${r}`)
      .join('\n')}\n\nWhy you'll love it here\n${perks}`;

  const job = (
    id: string,
    recruiterId: string,
    title: string,
    company: string,
    location: string,
    type: JobType,
    salary: string,
    age: number,
    description: string,
    status: Job['status'] = 'open',
  ): Job => ({
    id,
    recruiterId,
    title,
    company,
    location,
    type,
    salary,
    status,
    description,
    createdAt: daysAgo(age),
    updatedAt: daysAgo(age),
  });

  const jobs: Job[] = [
    job(
      'job_senior_fe',
      'usr_recruiter1',
      'Senior Frontend Engineer',
      'Northwind Labs',
      'Bengaluru',
      'Full-time',
      '₹32–45 LPA',
      1,
      desc(
        'Northwind Labs builds analytics tooling used by 4,000+ product teams. We are looking for a senior frontend engineer to own our visualization layer end-to-end.',
        [
          'Lead the architecture of our React + TypeScript dashboard platform',
          'Ship performant, accessible data visualizations used by millions',
          'Mentor engineers and raise the bar on code quality and reviews',
        ],
        ['5+ years building production web apps', 'Deep knowledge of React, TypeScript and modern CSS', 'An eye for detail and interaction design'],
        'Hybrid schedule, generous learning budget, top-tier health cover and a team that genuinely cares about craft.',
      ),
    ),
    job(
      'job_product_designer',
      'usr_recruiter1',
      'Product Designer',
      'Northwind Labs',
      'Remote',
      'Full-time',
      '$110k – $140k',
      3,
      desc(
        'Join a small, senior design team shaping how analysts explore data.',
        ['Own end-to-end design for new product surfaces', 'Run research sessions and turn insights into prototypes', 'Contribute to our design system'],
        ['4+ years of product design experience', 'A portfolio showing systems thinking', 'Fluency in Figma and prototyping tools'],
        'Fully remote, async-first culture with quarterly offsites.',
      ),
    ),
    job(
      'job_data_intern',
      'usr_recruiter1',
      'Data Science Intern',
      'Northwind Labs',
      'Hyderabad',
      'Internship',
      '₹60k / month',
      6,
      desc(
        'A 6-month internship working alongside our ML team on forecasting models.',
        ['Clean, explore and model real customer datasets', 'Build evaluation pipelines in Python', 'Present findings to product leadership'],
        ['Final-year student or recent graduate', 'Solid Python, pandas and statistics foundations', 'Curiosity and clear communication'],
        'Mentorship from senior data scientists and a strong conversion path to full-time.',
      ),
    ),
    job(
      'job_backend_go',
      'usr_recruiter2',
      'Backend Engineer (Go)',
      'Lumen Pay',
      'Pune',
      'Full-time',
      '₹24–36 LPA',
      2,
      desc(
        'Lumen Pay processes millions of payments every day. Help us build the reliable, low-latency services behind them.',
        ['Design and build high-throughput services in Go', 'Improve observability and reliability of our payment rails', 'Collaborate with product on new payment flows'],
        ['3+ years backend experience', 'Experience with Go, PostgreSQL and distributed systems', 'Comfort owning services in production'],
        'ESOPs, flexible hours, and a modern stack with real scale.',
      ),
    ),
    job(
      'job_devops_contract',
      'usr_recruiter2',
      'DevOps Engineer',
      'Lumen Pay',
      'Remote',
      'Contract',
      '$75 – $95 / hr',
      4,
      desc(
        'A 6-month contract to modernise our infrastructure-as-code and CI pipelines.',
        ['Migrate infrastructure to Terraform modules', 'Harden Kubernetes clusters and CI/CD pipelines', 'Document and hand over runbooks'],
        ['Strong Terraform, Kubernetes and AWS experience', 'Security-first mindset', 'Excellent written communication'],
        'Flexible hours and a possible extension.',
      ),
    ),
    job(
      'job_content_pt',
      'usr_recruiter2',
      'Content Strategist',
      'Lumen Pay',
      'London',
      'Part-time',
      '£35k pro-rata',
      8,
      desc(
        'Shape the voice of a fast-growing fintech brand, 3 days a week.',
        ['Own our editorial calendar across blog and newsletter', 'Write clear, trustworthy product copy', 'Measure and iterate on content performance'],
        ['3+ years in content or product marketing', 'Exceptional writing and editing', 'Fintech experience is a plus'],
        'A flexible schedule with a supportive, remote-friendly team.',
      ),
    ),
    job(
      'job_mobile_rn',
      'usr_recruiter1',
      'Mobile Engineer (React Native)',
      'Northwind Labs',
      'San Francisco',
      'Full-time',
      '$150k – $185k',
      10,
      desc(
        'Bring Northwind insights to iOS and Android with a delightful native experience.',
        ['Build our React Native app from the ground up', 'Work closely with design on motion and interaction', 'Set up testing and release automation'],
        ['4+ years of mobile development', 'Shipped React Native apps to the stores', 'Pride in polish and performance'],
        'Equity, relocation support and a beautiful SF office.',
      ),
    ),
    job(
      'job_qa_contract',
      'usr_recruiter2',
      'QA Automation Engineer',
      'Lumen Pay',
      'Bengaluru',
      'Contract',
      '₹1.8L / month',
      12,
      desc(
        'Help us ship faster with confidence by building a robust automated test suite.',
        ['Build end-to-end tests with Playwright', 'Integrate test suites into CI', 'Partner with engineers on testability'],
        ['3+ years of QA automation', 'Playwright or Cypress experience', 'Attention to detail'],
        'Clear scope, great team, and hybrid flexibility.',
      ),
      'closed',
    ),
  ];

  const app = (
    id: string,
    jobId: string,
    candidateId: string,
    status: ApplicationStatus,
    age: number,
    coverNote: string,
  ): Application => ({
    id,
    jobId,
    candidateId,
    coverNote,
    resumePath: `${candidateId}/${id}.pdf`,
    resumeName: `${users.find((u) => u.id === candidateId)!.name.replace(' ', '_')}_Resume.pdf`,
    status,
    createdAt: daysAgo(age),
    updatedAt: daysAgo(age),
  });

  const applications: Application[] = [
    app('app_1', 'job_senior_fe', 'usr_candidate1', 'shortlisted', 1, 'I have led frontend at two SaaS startups and love building data-heavy interfaces. Would be thrilled to help shape your visualization layer.'),
    app('app_2', 'job_backend_go', 'usr_candidate1', 'reviewing', 2, 'Go has been my primary language for 3 years, most recently on a payments reconciliation service.'),
    app('app_3', 'job_product_designer', 'usr_candidate1', 'applied', 3, 'Designer with a strong systems background — portfolio linked in my resume.'),
    app('app_4', 'job_senior_fe', 'usr_candidate2', 'reviewing', 1, 'Seven years of React experience, including a large-scale migration to TypeScript.'),
    app('app_5', 'job_senior_fe', 'usr_candidate3', 'applied', 0, 'Accessibility advocate and frontend engineer — I would love to chat.'),
    app('app_6', 'job_data_intern', 'usr_candidate3', 'shortlisted', 5, 'Final-year CS student with two Kaggle medals and a passion for forecasting.'),
    app('app_7', 'job_mobile_rn', 'usr_candidate2', 'rejected', 9, 'I have shipped three React Native apps with 100k+ downloads each.'),
    app('app_8', 'job_backend_go', 'usr_candidate4', 'hired', 11, 'Four years building payment services in Go and PostgreSQL, including a ledger that handles 2M transactions a day.'),
    app('app_9', 'job_devops_contract', 'usr_candidate4', 'reviewing', 3, 'I have migrated two companies to Terraform and hardened EKS clusters for PCI compliance. Available to start immediately.'),
    app('app_10', 'job_content_pt', 'usr_candidate5', 'shortlisted', 6, 'I write product copy and long-form content for fintech brands, and a three-day week suits me perfectly.'),
    app('app_11', 'job_product_designer', 'usr_candidate5', 'reviewing', 2, 'Product designer with a background in content design — I love turning research into clear, simple flows.'),
    app('app_12', 'job_data_intern', 'usr_candidate6', 'applied', 1, 'Final-year student who has built forecasting models for a local retail chain. Keen to learn from your ML team.'),
    app('app_13', 'job_mobile_rn', 'usr_candidate6', 'shortlisted', 7, 'Full-stack engineer who has shipped two React Native apps; I care a lot about smooth animations and offline support.'),
    app('app_14', 'job_qa_contract', 'usr_candidate4', 'rejected', 13, 'I have built Playwright suites from scratch for three product teams and integrated them into CI.'),
    app('app_15', 'job_content_pt', 'usr_candidate3', 'applied', 0, 'I run a small newsletter about personal finance and would love to write for Lumen Pay part-time.'),
    app('app_16', 'job_devops_contract', 'usr_candidate6', 'applied', 2, 'Comfortable with Kubernetes, Terraform and GitHub Actions; happy to work async across time zones.'),
    app('app_17', 'job_senior_fe', 'usr_candidate6', 'rejected', 4, 'Full-stack engineer with strong React skills and an interest in data visualisation.'),
  ];

  return { users, jobs, applications };
}

/** Background shown on each demo candidate's resume. */
const PROFILES: Record<string, { headline: string; summary: string; roles: string[]; skills: string; education: string }> = {
  usr_candidate1: {
    headline: 'Senior Frontend Engineer',
    summary: '7 years building data-heavy React and TypeScript products for SaaS startups.',
    roles: ['Lead Frontend Engineer, Quantly (2021 - present)', 'Frontend Engineer, Brightwave (2018 - 2021)'],
    skills: 'React, TypeScript, D3, Next.js, Design systems, Go (basic)',
    education: 'B.Tech, Computer Science - IIT Hyderabad (2017)',
  },
  usr_candidate2: {
    headline: 'Frontend & Mobile Engineer',
    summary: 'Ships React and React Native apps used by hundreds of thousands of people.',
    roles: ['Senior Engineer, Appcraft (2020 - present)', 'Mobile Developer, Lagos Digital (2017 - 2020)'],
    skills: 'React, React Native, TypeScript, Expo, Redux, Jest',
    education: 'B.Sc, Computer Engineering - University of Lagos (2016)',
  },
  usr_candidate3: {
    headline: 'Computer Science Student & Writer',
    summary: 'Final-year student into forecasting, accessibility and clear writing.',
    roles: ['Data Science Intern, RetailIQ (Summer 2025)', 'Editor, Campus Tech Journal (2023 - present)'],
    skills: 'Python, pandas, scikit-learn, SQL, WCAG, Technical writing',
    education: 'B.Sc, Computer Science - University of Porto (2026, expected)',
  },
  usr_candidate4: {
    headline: 'Backend & Platform Engineer',
    summary: 'Builds reliable Go services and the infrastructure they run on.',
    roles: ['Backend Engineer, PayStream (2021 - present)', 'DevOps Engineer, CloudNine (2018 - 2021)'],
    skills: 'Go, PostgreSQL, Kubernetes, Terraform, AWS, Playwright',
    education: 'B.E, Information Technology - Pune University (2018)',
  },
  usr_candidate5: {
    headline: 'Product Designer & Content Strategist',
    summary: 'Turns research into simple flows and clear, trustworthy product copy.',
    roles: ['Product Designer, Finley (2022 - present)', 'Content Designer, Pennywise Labs (2019 - 2022)'],
    skills: 'Figma, User research, Prototyping, UX writing, Content strategy',
    education: 'BA, Communication Design - NID Ahmedabad (2019)',
  },
  usr_candidate6: {
    headline: 'Full-stack Engineer',
    summary: 'Full-stack developer comfortable from React Native front ends to Kubernetes back ends.',
    roles: ['Software Engineer, Shiplane (2022 - present)', 'Junior Developer, Brook & Co (2020 - 2022)'],
    skills: 'TypeScript, React Native, Node.js, Python, Kubernetes, GitHub Actions',
    education: 'B.Sc, Software Engineering - University of Leeds (2020)',
  },
};

function resumePdf(user: User, job: Job | undefined): Buffer {
  const p = PROFILES[user.id] ?? PROFILES.usr_candidate1;
  const handle = user.email.split('@')[0];
  return renderPdf([
    [26, user.name, true],
    [13, p.headline],
    [10, `${user.email}  |  linkedin.com/in/${handle}  |  +91 98765 43210`],
    [10, ''],
    [13, 'Summary', true],
    [11, p.summary],
    [10, ''],
    [13, 'Experience', true],
    ...p.roles.map((r): PdfLine => [11, `- ${r}`]),
    [10, ''],
    [13, 'Skills', true],
    [11, p.skills],
    [10, ''],
    [13, 'Education', true],
    [11, p.education],
    [10, ''],
    [9, job ? `Submitted for: ${job.title} at ${job.company}` : ''],
    [9, 'Demo resume generated for the Hireloom job portal - not a real person.'],
  ]);
}

/** Full demo data set: rows (with password hashes) plus a resume PDF for every application. */
export function buildSeed(): SeedData {
  const { users, jobs, applications } = records();
  const passwordHash = hashPassword(DEMO_PASSWORD);
  for (const u of users) u.passwordHash = passwordHash;
  const files = applications.map((a) => ({
    path: a.resumePath,
    data: resumePdf(users.find((u) => u.id === a.candidateId)!, jobs.find((j) => j.id === a.jobId)),
  }));
  return { users, jobs, applications, files };
}

/**
 * The resume PDF for a demo application, by its storage path (null for real applications).
 * Lets demo data loaded with plain SQL (supabase/seed.sql) show resumes without uploading files.
 */
export function demoResume(path: string): Buffer | null {
  const { users, jobs, applications } = records();
  const app = applications.find((a) => a.resumePath === path);
  if (!app) return null;
  const user = users.find((u) => u.id === app.candidateId);
  return user ? resumePdf(user, jobs.find((j) => j.id === app.jobId)) : null;
}
