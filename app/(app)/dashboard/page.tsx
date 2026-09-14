import { createClient } from '@/lib/supabase/server';

const STATUS: Record<string, { label: string; cls: string }> = {
  action_required: { label: 'Action required: upload documents', cls: 'badge-amber' },
  under_review: { label: 'Under government review', cls: 'badge-navy' },
  ca_in_preparation: { label: 'CA draft in preparation', cls: 'badge-navy' },
  registered_compliant: { label: 'Registered and compliant', cls: 'badge-green' },
};

const CAT_LABEL: Record<string, string> = {
  category_1_rigid: 'Category I, rigid',
  category_2_flexible: 'Category II, flexible',
  category_3_multilayered: 'Category III, multilayered',
};

export default async function Dashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles').select('company_id').eq('id', user!.id).single();

  const { data: company } = await supabase
    .from('companies').select('*').eq('id', profile!.company_id).single();

  const { count: docCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('is_deliverable', false);

  const status = STATUS[company!.compliance_status] ?? STATUS.action_required;

  return (
    <div>
      <h1>{company!.name}</h1>
      <div className="row" style={{ marginBottom: '1rem' }}>
        <span className={`badge ${status.cls}`}>{status.label}</span>
      </div>

      <div className="grid grid-3">
        <div className="card">
          <div className="metric-label">Packaging category</div>
          <div className="metric" style={{ fontSize: '1.1rem' }}>
            {CAT_LABEL[company!.primary_packaging_category] ?? 'Not set'}
          </div>
        </div>
        <div className="card">
          <div className="metric-label">KYC documents uploaded</div>
          <div className="metric">{docCount ?? 0}</div>
        </div>
        <div className="card">
          <div className="metric-label">Registration on file</div>
          <div className="metric" style={{ fontSize: '1.1rem' }}>
            {company!.existing_cpcb_reg || 'None yet'}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <h2>What happens next</h2>
        <p className="muted">
          Upload your KYC documents so our team can prepare your CPCB registration. You will see the
          status change here, and your finished certificates appear under Downloads.
        </p>
        <a className="btn" href="/documents">Upload documents</a>
      </div>
    </div>
  );
}
