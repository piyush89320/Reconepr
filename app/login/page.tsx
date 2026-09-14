'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
          <p className="muted">The link opens your ReconEPR account. You can close this tab.</p>
        </div>
      ) : (
        <div className="card">
          <p className="muted">
            We use a one-time email link, so there is no password to remember.
          </p>
          <label htmlFor="name">Your name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Sharma" />
          <label htmlFor="email">Work email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          {error && <p className="error">{error}</p>}
          <div style={{ marginTop: '1rem' }}>
            <button className="btn" onClick={sendLink} disabled={loading}>
              {loading ? 'Sending link' : 'Email me a sign-in link'}
            </button>
          </div>
          <p className="notice" style={{ marginTop: '1rem' }}>
            By continuing you agree to our privacy notice. We collect your company and KYC details only to prepare your EPR filing.
          </p>
        </div>
      )}
    </main>
  );
}
