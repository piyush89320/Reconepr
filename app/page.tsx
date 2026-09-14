import Link from 'next/link';

export default function Landing() {
  return (
    <main>
      <header className="topbar">
        <span className="brand">ReconEPR</span>
        <nav className="nav">
          <Link href="/estimator">Estimate your liability</Link>
          <Link href="/login">Sign in</Link>
        </nav>
      </header>
      <div className="container">
        <h1>Know your plastic EPR liability, then let us file it.</h1>
        <p className="muted">
          If your brand sells in plastic packaging, the CPCB rules make you responsible for
          recycling a rising share of it every year. Missing the target means environmental
          compensation on the shortfall. We work out what you owe and handle the registration,
          the CA certificate, and the annual return.
        </p>
        <div className="row" style={{ marginTop: '1rem' }}>
          <Link className="btn" href="/estimator">Estimate your liability</Link>
          <Link className="btn btn-secondary" href="/login">Start your filing</Link>
        </div>
      </div>
    </main>
  );
}
