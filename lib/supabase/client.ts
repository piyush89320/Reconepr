// Browser Supabase client. Uses the anon key, so every query it makes is
// subject to the RLS policies in supabase/schema.sql. That is what keeps one
// company from reading another's rows even though the key is public.
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
