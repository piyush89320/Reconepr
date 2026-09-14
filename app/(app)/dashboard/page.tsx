import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { categoryLabel, targetPercent, inr, INDICATIVE_RATE_LOW, INDICATIVE_RATE_HIGH } from '@/lib/epr';

const STATUS: Record<string, { label: string; cls: string }> = {
  action_required: { label: 'Action required: upload documents', cls: 'badge-amber' },
  under_review: { label: 'Under government review', cls: 'badge-navy' },
  ca_in_preparation: { label: 'CA draft in preparation', cls: 'badge-navy' },
  registered_compliant: { label: 'Registered and compliant', cls: 'badge-green' },
};

// The financial year the dashboard estimates against.
const CURRENT_FY = 'FY 2026-27';

export default async function Dashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles').select('company_id').eq('id', user!.id).single();

  // A signed-in user with no company has not onboarded yet.
  if (!profile?.company_id) redirect('/onboarding');

  const { data: company } = await supabase
    .from('companies').select('*').eq('id', profile.company_id).single();

  const { count: docCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('is_deliverable', false);

  const status = STATUS[company!.compliance_status] ?? STATUS.action_required;
  const weight = company!.annual_weight_kg as number | null;
  const pct = targetPercent(CURRENT_FY, company!.primary_packaging_category);
  const obligationKg = weight && pct ? weight * pct : null;
  const costLow = obligationKg ? obligationKg * INDICATIVE_RATE_LOW : null;
  const costHigh = obligationKg ? obligationKg * INDICATIVE_RATE_HIGH : null;

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>{company!.name}</h1>
        <Link className="btn btn-secondary" href="/settings">Edit company details</Link>
      </div>
      <div className="row" style={{ marginBottom: '1rem' }}>
        <span className={`badge ${status.cls}`}>{status.label}</span>
      </div>

      <div className="grid grid-3">
        <div className="card">
          <div className="metric-label">Business type</div>
          <div className="metric" style={{ fontSize: '1.1rem' }}>{company!.company_type ?? 'Not set'}</div>
          <div className="notice">{company!.product_type || 'Product not set'}</div>
        </div>
        <div className="card">
          <div className="metric-label">Packaging category</div>
          <div className="metric" style={{ fontSize: '1rem' }}>{categoryLabel(company!.primary_packaging_category)}</div>
        </div>
        <div className="card">
          <div className="metric-label">Annual plastic reported</div>
          <div className="metric">{weight != null ? `${weight.toLocaleString('en-IN')} kg` : 'Not set'}</div>
        </div>
      </div>

      <h2 style={{ marginTop: '1.5rem' }}>Your {CURRENT_FY} liability</h2>
      {obligationKg == null ? (
        <div className="card">
          <p style={{ margin: 0 }}>
            Add your annual plastic weight in Company details to see your estimated obligation and cost.
          </p>
          <div style={{ marginTop: '0.75rem' }}>
            <Link className="btn" href="/settings">Add your plastic weight</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-3">
            <div className="card">
              <div className="metric-label">Recycling target</div>
              <div className="metric">{Math.round(pct! * 100)}%</div>
            </div>
            <div className="card">
              <div className="metric-label">Obligation to cover</div>
              <div className="metric">{Math.round(obligationKg).toLocaleString('en-IN')} kg</div>
            </div>
            <div className="card">
              <div className="metric-label">Indicative credit cost</div>
              <div className="metric">{inr(costLow!)}</div>
              <div className="metric-label">to {inr(costHigh!)}</div>
            </div>
          </div>
          <p className="notice" style={{ marginTop: '0.75rem' }}>
            Indicative only. The CPCB base is the average of your last two financial years, and the final rate is confirmed on quote.
          </p>
        </>
      )}

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h2>What happens next</h2>
        <p className="muted">
          Upload your KYC documents so our team can prepare your CPCB registration. The status above updates as we progress, and your certificates appear under Downloads.
        </p>
        <div className="row">
          <Link className="btn" href="/documents">Upload documents</Link>
          <span className="notice">{docCount ?? 0} document{(docCount ?? 0) === 1 ? '' : 's'} uploaded</span>
        </div>
      </div>
    </div>
  );
}
