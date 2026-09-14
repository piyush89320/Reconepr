import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Protects every app page, refreshes nothing (middleware does that), and makes
// sure a signed-in user without a company is routed to onboarding.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  return (
    <>
      <header className="topbar">
        <Link className="brand" href="/dashboard">ReconEPR</Link>
        <nav className="nav">
          {profile?.company_id && (
            <>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/documents">Documents</Link>
              <Link href="/downloads">Downloads</Link>
            </>
          )}
          <form action="/auth/signout" method="post" style={{ display: 'inline' }}>
            <button className="nav" style={{ background: 'none', border: 0, color: '#fff', cursor: 'pointer', fontSize: '0.95rem' }}>
              Sign out
            </button>
          </form>
        </nav>
      </header>
      <div className="container">{children}</div>
    </>
  );
}
