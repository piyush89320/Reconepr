import { createClient } from '@/lib/supabase/server';
import DocumentsClient from '@/components/DocumentsClient';

export default async function DocumentsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles').select('company_id').eq('id', user!.id).single();

  const { data: docs } = await supabase
    .from('documents')
    .select('id, doc_type, storage_path, created_at')
    .eq('is_deliverable', false)
    .order('created_at', { ascending: false });

  return (
    <div className="narrow">
      <h1>Upload documents</h1>
      <p className="muted">
        These KYC documents let us register and file on your behalf. PDF or image files are fine.
      </p>
      <DocumentsClient companyId={profile!.company_id!} initialDocs={docs ?? []} />
    </div>
  );
}
