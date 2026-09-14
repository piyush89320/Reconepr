import { createClient } from '@/lib/supabase/server';

const LABELS: Record<string, string> = {
  ca_certificate: 'Signed CA certificate',
  registration_certificate: 'CPCB registration certificate',
  credit_receipt: 'EPR credit transfer receipt',
};

export default async function Downloads() {
  const supabase = createClient();

  const { data: docs } = await supabase
    .from('documents')
    .select('id, doc_type, storage_path, created_at')
    .eq('is_deliverable', true)
    .order('created_at', { ascending: false });

  // Generate short-lived signed URLs server-side. RLS still applies, so this
  // only ever returns links for the caller's own company.
  const withUrls = await Promise.all(
    (docs ?? []).map(async (d) => {
      const { data } = await supabase.storage
        .from('documents').createSignedUrl(d.storage_path, 120);
      return { ...d, url: data?.signedUrl };
    })
  );

  return (
    <div className="narrow">
      <h1>Downloads</h1>
      <p className="muted">Final documents our team has prepared for you appear here.</p>
      {withUrls.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0 }}>Nothing to download yet. Your certificates will show up here once they are ready.</p>
        </div>
      ) : (
        <div className="card">
          <ul className="filelist">
            {withUrls.map((d) => (
              <li key={d.id}>
                <span>{LABELS[d.doc_type] ?? d.doc_type}</span>
                {d.url
                  ? <a className="btn btn-secondary" href={d.url}>Download</a>
                  : <span className="notice">Unavailable</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
