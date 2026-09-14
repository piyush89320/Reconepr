// Handles the magic-link redirect. Exchanges the code for a session, then
// sends the user to the app. New users with no company land on onboarding.
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();
        const dest = profile?.company_id ? '/dashboard' : '/onboarding';
        return NextResponse.redirect(`${origin}${dest}`);
      }
    }
  }
  return NextResponse.redirect(`${origin}/login?error=link`);
}
