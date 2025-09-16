import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

// Helper to get current user and check role
async function getCurrentUser(supabase) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return null;

    const { data: userProfile, error: profileError } = await supabase
        .from('gckitbut_users')
        .select('role')
        .eq('auth_user_id', user.id)
        .single();

    return userProfile;
}


export async function GET(request: Request) {
  const supabase = await getSupabase();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Not enough permissions' }, { status: 403 });
  }

  const { data: users, error } = await supabase
    .from('gckitbut_users')
    .select('*');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(users);
}
