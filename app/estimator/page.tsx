'use client';
import { useState } from 'react';
import Link from 'next/link';

// Recycling target percentage by financial year and category.
// Confirmed for FY 2025-26 through 2027-28. Add earlier years only after
// checking the gazette. Keep this in sync with the target_rates table.
const RATES: Record<string, Record<string, number>> = {
  'FY 2025-26': { rigid: 0.6, flexible: 0.4, multilayered: 0.4 },
  'FY 2026-27': { rigid: 0.7, flexible: 0.5, multilayered: 0.5 },
  'FY 2027-28': { rigid: 0.8, flexible: 0.6, multilayered: 0.6 },
};

// Indicative credit rate in INR per kg, shown as a range. This is a rough
// guide only. Replace with your own indexed pricing before launch and always
// label the on-screen number as indicative, confirmed on quote.
const RATE_LOW = 25;
const RATE_HIGH = 40;

const CATEGORY_LABEL: Record<string, string> = {
  rigid: 'Category I, rigid (bottles, jars, containers)',
  flexible: 'Category II, flexible (films, pouches, sachets)',
  multilayered: 'Category III, multilayered (foil-laminated packs)',
};

function inr(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export default function Estimator() {
  const [fy, setFy] = useState('FY 2026-27');
  const [category, setCategory] = useState('rigid');
  const [weight, setWeight] = useState('');

  const kg = parseFloat(weight);
  const pct = RATES[fy][category];
  const obligationKg = isFinite(kg) ? kg * pct : 0;
  const costLow = obligationKg * RATE_LOW;
  const costHigh = obligationKg * RATE_HIGH;

  return (
    <main>
      <header className="topbar">
        <Link className="brand" href="/">ReconEPR</Link>
        <nav className="nav"><Link href="/login">Sign in</Link></nav>
      </header>
      <div className="container narrow">
        <h1>Estimate your EPR liability</h1>
        <p className="muted">
          Enter the plastic packaging you put into the market in a year. We show the recycling
          obligation and an indicative cost to cover it with credits.
        </p>
        <div className="card">
          <label htmlFor="fy">Financial year</label>
          <select id="fy" value={fy} onChange={(e) => setFy(e.target.value)}>
            {Object.keys(RATES).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          <label htmlFor="cat">Packaging category</label>
          <select id="cat" value={category} onChange={(e) => setCategory(e.target.value)}>
            {Object.keys(CATEGORY_LABEL).map((c) => (
              <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
            ))}
          </select>

          <label htmlFor="w">Plastic packaging per year (kg)</label>
          <input id="w" type="number" min="0" value={weight}
                 onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 12000" />
        </div>

        {obligationKg > 0 && (
          <div className="card grid grid-3" style={{ marginTop: '1rem' }}>
            <div>
              <div className="metric-label">Recycling target</div>
              <div className="metric">{Math.round(pct * 100)}%</div>
            </div>
            <div>
              <div className="metric-label">Obligation to cover</div>
              <div className="metric">{Math.round(obligationKg).toLocaleString('en-IN')} kg</div>
            </div>
            <div>
              <div className="metric-label">Indicative credit cost</div>
              <div className="metric">{inr(costLow)}</div>
              <div className="metric-label">to {inr(costHigh)}</div>
            </div>
          </div>
        )}

        <p className="notice" style={{ marginTop: '1rem' }}>
          Indicative only. The obligation base under CPCB is the average of your last two
          financial years, and the final credit rate is confirmed on quote. This is an estimate,
          not a filing.
        </p>
        <div style={{ marginTop: '1rem' }}>
          <Link className="btn" href="/login">Get an exact quote</Link>
        </div>
      </div>
    </main>
  );
}
