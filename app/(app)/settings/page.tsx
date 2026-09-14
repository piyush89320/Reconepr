'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { COMPANY_TYPES, CATEGORIES } from '@/lib/epr';

// Company details page. Edit company info, and set a password so you can sign
// in without an email link next time.
export default function Settings() {
  const router = useRouter();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [f, setF] = useState({
    name: '', company_type: 'Water Bottler', product_type: '',
    primary_packaging_category: 'category_1_rigid', existing_cpcb_reg: '',
    annual_weight_kg: '',
  });

  // Password state
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [pwSaved, setPwSaved] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: profile } = await supabase
        .from('profiles').select('company_id').eq('id', user.id).single();
      if (!profile?.company_id) { router.push('/onboarding'); return; }
      setCompanyId(profile.company_id);
      const { data: c } = await supabase
        .from('companies').select('*').eq('id', profile.company_id).single();
      if (c) {
        setF({
          name: c.name ?? '',
          company_type: c.company_type ?? 'Water Bottler',
          product_type: c.product_type ?? '',
          primary_packaging_category: c.primary_packaging_category ?? 'category_1_rigid',
          existing_cpcb_reg: c.existing_cpcb_reg ?? '',
          annual_weight_kg: c.annual_weight_kg != null ? String(c.annual_weight_kg) : '',
        });
      }
      setLoading(false);
    })();
  }, [router]);

  function set(k: string, v: string) { setF({ ...f, [k]: v }); setSaved(false); }

  async function save() {
    setError(''); setSaving(true); setSaved(false);
    const supabase = createClient();
    const weight = f.annual_weight_kg === '' ? null : Number(f.annual_weight_kg);
    const { error } = await supabase.from('companies').update({
      name: f.name,
      company_type: f.company_type,
      product_type: f.product_type,
      primary_packaging_category: f.primary_packaging_category,
      existing_cpcb_reg: f.existing_cpcb_reg || null,
      annual_weight_kg: weight,
    }).eq('id', companyId);
    setSaving(false);
    if (error) { setError(error.message); return; }
    setSaved(true);
    router.refresh();
  }

  async function savePassword() {
    setPwErr(''); setPwSaved(false);
    if (pw.length < 8) { setPwErr('Use at least 8 characters.'); return; }
    if (pw !== pw2) { setPwErr('The two passwords do not match.'); return; }
    setSavingPw(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSavingPw(false);
    if (error) { setPwErr(error.message); return; }
    setPwSaved(true); setPw(''); setPw2('');
  }

  if (loading) return <div className="narrow"><p className="muted">Loading your details.</p></div>;

  return (
    <div className="narrow">
      <h1>Company details</h1>
      <p className="muted">Update anything here. The dashboard uses your category and annual weight to estimate your liability.</p>
      <div className="card">
        <label>Company name</label>
        <input value={f.name} onChange={(e) => set('name', e.target.value)} />

        <label>Company type</label>
        <select value={f.company_type} onChange={(e) => set('company_type', e.target.value)}>
          {COMPANY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <label>What you sell (plain words)</label>
        <input value={f.product_type} onChange={(e) => set('product_type', e.target.value)} placeholder="Packaged water" />

        <label>Packaging category</label>
        <select value={f.primary_packaging_category} onChange={(e) => set('primary_packaging_category', e.target.value)}>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>

        <label>Plastic packaging per year (kg)</label>
        <input type="number" min="0" value={f.annual_weight_kg}
               onChange={(e) => set('annual_weight_kg', e.target.value)} placeholder="e.g. 12000" />

        <label>Existing CPCB registration number (optional)</label>
        <input value={f.existing_cpcb_reg} onChange={(e) => set('existing_cpcb_reg', e.target.value)} />

        {error && <p className="error">{error}</p>}
        <div className="row" style={{ marginTop: '1rem' }}>
          <button className="btn" onClick={save} disabled={saving}>
            {saving ? 'Saving' : 'Save changes'}
          </button>
          {saved && <span className="badge badge-green">Saved</span>}
        </div>
      </div>

      <h2 style={{ marginTop: '1.5rem' }}>Password</h2>
      <div className="card">
        <p className="muted">Set a password so you can sign in without an email link next time.</p>
        <label>New password</label>
        <input type="password" value={pw} onChange={(e) => { setPw(e.target.value); setPwSaved(false); }} placeholder="At least 8 characters" />
        <label>Confirm password</label>
        <input type="password" value={pw2} onChange={(e) => { setPw2(e.target.value); setPwSaved(false); }} />
        {pwErr && <p className="error">{pwErr}</p>}
        <div className="row" style={{ marginTop: '1rem' }}>
          <button className="btn" onClick={savePassword} disabled={savingPw}>
            {savingPw ? 'Saving' : 'Set password'}
          </button>
          {pwSaved && <span className="badge badge-green">Password set</span>}
        </div>
      </div>
    </div>
  );
}
