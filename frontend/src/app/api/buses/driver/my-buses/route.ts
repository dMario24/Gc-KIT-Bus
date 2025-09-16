import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Reusable function to get Supabase client
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

// Helper to get current user's profile
async function getCurrentUser(supabase) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return null;

    const { data: userProfile, error: profileError } = await supabase
        .from('gckitbut_users')
        .select('id, role')
        .eq('auth_user_id', user.id)
        .single();

    return userProfile;
}

export async function GET(request: Request) {
  const supabase = await getSupabase();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || currentUser.role !== 'driver') {
    return NextResponse.json({ error: 'Only drivers can access this endpoint' }, { status: 403 });
  }

  const { data: buses, error } = await supabase
    .from('gckitbut_buses')
    .select('*, route:gckitbut_bus_routes(*)')
    .eq('driver_id', currentUser.id)
    .eq('is_active', true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!buses || buses.length === 0) {
      return NextResponse.json({ message: "No buses assigned to this driver" }, { status: 404 });
  }

  return NextResponse.json(buses);
}
