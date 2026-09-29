import type { Metadata } from 'next';
import { Instrument_Serif, Plus_Jakarta_Sans } from 'next/font/google';
import Navbar from '@/components/Navbar';
import SetupRequired from '@/components/SetupRequired';
import { getCurrentUser } from '@/lib/auth';
import { storageMode } from '@/lib/repo';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' });
const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Hireloom — Find work that fits', template: '%s · Hireloom' },
  description: 'A modern job portal for candidates and recruiters.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Vercel can't keep local files, so without Supabase show setup steps instead of erroring.
  if (storageMode === 'local' && process.env.VERCEL) {
    return (
      <html lang="en" className={`${jakarta.variable} ${serif.variable}`}>
        <body>
          <SetupRequired />
        </body>
      </html>
    );
  }

  const user = await getCurrentUser();

  return (
    <html lang="en" className={`${jakarta.variable} ${serif.variable}`}>
      <body>
        <Navbar user={user ? { name: user.name, role: user.role } : null} />
        <main>{children}</main>
        <footer className="footer">
          <div className="container">
            <span>© {new Date().getFullYear()} Hireloom. Crafted for great hiring.</span>
            <span>
              {storageMode === 'local'
                ? 'Local mode · data is saved on this computer'
                : 'Candidates · Recruiters · Opportunities'}
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
