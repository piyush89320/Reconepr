'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Returning users sign in with a password (no email sent). First-time users
// get a one-time email link, then set a password under Company details.
export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'password' | 'link'>('password');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInPassword() {
    setError('');
    if (!email || !password) { setError('Enter your email and password.'); return; }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError('Email or password is incorrect. If this is your first time, use the email link below.');
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  async function sendLink() {
    setError('');
    if (!email) { setError('Enter your email to continue.'); return; }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: name },
      },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSent(true);
  }

  return (
    <main className="container narrow">
      <h1>Sign in to ReconEPR</h1>

      {sent ? (
        <div className="card stack">
          <p>Check your inbox. We sent a sign-in link to {email}.</p>
          <p className="muted">
            Open the newest email and click the link once. After you are in, set a password under
            Company details so next time you can sign in without email.
          </p>
        </div>
      ) : mode === 'password' ? (
        <div className="card">
          <p className="muted">Returning users sign in with a password.</p>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="error">{error}</p>}
          <div style={{ marginTop: '1rem' }}>
            <button className="btn" onClick={signInPassword} disabled={loading}>
              {loading ? 'Signing in' : 'Sign in'}
            </button>
          </div>
          <p className="notice" style={{ marginTop: '1rem' }}>
            First time here, or no password yet?{' '}
            <a role="button" style={{ cursor: 'pointer', textDecoration: 'underline' }}
               onClick={() => { setError(''); setMode('link'); }}>
              Email me a sign-in link
            </a>
          </p>
        </div>
      ) : (
        <div className="card">
          <p className="muted">First time in, we email you a one-time link. No password needed yet.</p>
          <label htmlFor="name">Your name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Sharma" />
          <label htmlFor="email2">Email</label>
          <input id="email2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          {error && <p className="error">{error}</p>}
          <div style={{ marginTop: '1rem' }}>
            <button className="btn" onClick={sendLink} disabled={loading}>
              {loading ? 'Sending link' : 'Email me a sign-in link'}
            </button>
          </div>
          <p className="notice" style={{ marginTop: '1rem' }}>
            Have a password already?{' '}
            <a role="button" style={{ cursor: 'pointer', textDecoration: 'underline' }}
               onClick={() => { setError(''); setMode('password'); }}>
              Sign in with password
            </a>
          </p>
          <p className="notice">
            By continuing you agree to our privacy notice. We collect your company and KYC details only to prepare your EPR filing.
          </p>
        </div>
      )}
    </main>
  );
}
