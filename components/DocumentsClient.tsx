'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const SLOTS = [
  { type: 'gst_certificate', label: 'GST certificate' },
  { type: 'pan_card', label: 'PAN card' },
  { type: 'consent_to_operate', label: 'Consent to Operate (CTO)' },
  { type: 'msme_dic', label: 'MSME or DIC certificate' },
];

type Doc = { id: string; doc_type: string; storage_path: string; created_at: string };

export default function DocumentsClient({
  companyId, initialDocs,
}: { companyId: string; initialDocs: Doc[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const byType = (t: string) => initialDocs.find((d) => d.doc_type === t);

  async function upload(docType: string, file: File) {
    setError('');
    setBusy(docType);
    const supabase = createClient();
    const ext = file.name.split('.').pop() || 'pdf';
    const path = `${companyId}/${docType}-${Date.now()}.${ext}`;
    // Storage RLS only allows writing into this company's own folder.
    const { error: upErr } = await supabase.storage.from('documents').upload(path, file);
    if (upErr) { setError(upErr.message); setBusy(null); return; }
    const { error: rowErr } = await supabase.from('documents').insert({
      company_id: companyId, doc_type: docType, storage_path: path, is_deliverable: false,
    });
    setBusy(null);
    if (rowErr) { setError(rowErr.message); return; }
    router.refresh();
  }

  return (
    <div className="card">
      {SLOTS.map((s) => {
        const existing = byType(s.type);
        return (
          <div key={s.type} className="row" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--line)', padding: '0.7rem 0' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{s.label}</div>
              <div className="notice">{existing ? 'Uploaded' : 'Not uploaded yet'}</div>
            </div>
            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              {busy === s.type ? 'Uploading' : existing ? 'Replace' : 'Upload'}
              <input type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png"
                     onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(s.type, f); }} />
            </label>
          </div>
        );
      })}
      {error && <p className="error" style={{ marginTop: '0.75rem' }}>{error}</p>}
      <p className="notice" style={{ marginTop: '0.75rem' }}>
        Your files are stored privately and are visible only to your company and our compliance team.
      </p>
    </div>
  );
}
