'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const CATEGORIES = [
  { v: 'category_1_rigid', l: 'Rigid (bottles, jars, containers)' },
  { v: 'category_2_flexible', l: 'Flexible (films, pouches, sachets)' },
  { v: 'category_3_multilayered', l: 'Multilayered (foil-laminated packs)' },
];
const TYPES = ['Water Bottler', 'Snack/Chips Manufacturer', 'Tea Estate', 'FMCG', 'Other'];

export default function Onboarding() {
  const router = useRouter();
  const [f, setF] = useState({
    name: '', gst: '', companyType: 'Water Bottler', productType: '',
    packaging: 'category_1_rigid', existingReg: '',
  });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(k: string, v: string) { setF({ ...f, [k]: v }); }

  async function submit() {
    setError('');
    if (!f.name || !f.gst) { setError('Company name and GST number are required.'); return; }
    if (!consent) { setError('Please accept the privacy notice to continue.'); return; }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc('create_company_and_link', {
      p_name: f.name,
      p_gst: f.gst.trim(),
      p_company_type: f.companyType,
      p_product_type: f.productType,
      p_packaging_category: f.packaging,
      p_existing_cpcb_reg: f.existingReg,
      p_notice_version: process.env.NEXT_PUBLIC_PRIVACY_NOTICE_VERSION || '',
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="narrow">
      <h1>Set up your company</h1>
      <p className="muted">We use these details to determine your EPR category and prepare your CPCB registration.</p>
      <div className="card">
        <label>Company name</label>
        <input value={f.name} onChange={(e) => set('name', e.target.value)} />
        <label>GST number</label>
        <input value={f.gst} onChange={(e) => set('gst', e.target.value)} placeholder="22AAAAA0000A1Z5" />
        <label>What do you sell? (plain words)</label>
        <input value={f.productType} onChange={(e) => set('productType', e.target.value)} placeholder="Packaged water" />
        <label>Company type</label>
        <select value={f.companyType} onChange={(e) => set('companyType', e.target.value)}>
          {TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <label>Main packaging</label>
        <select value={f.packaging} onChange={(e) => set('packaging', e.target.value)}>
          {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
        </select>
        <label>Existing CPCB registration number (optional)</label>
        <input value={f.existingReg} onChange={(e) => set('existingReg', e.target.value)} />

        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginTop: '1rem' }}>
          <input type="checkbox" style={{ width: 'auto', marginTop: '0.3rem' }}
                 checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span className="notice">
            I agree to the privacy notice. ReconEPR may process our company and KYC details to
            prepare and file our EPR compliance.
          </span>
        </label>
        {error && <p className="error">{error}</p>}
        <div style={{ marginTop: '1rem' }}>
          <button className="btn" onClick={submit} disabled={loading}>
            {loading ? 'Saving' : 'Create company'}
          </button>
        </div>
      </div>
    </div>
  );
}
