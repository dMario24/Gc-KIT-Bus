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

// Reusable function to get current user's role
async function getCurrentUserRole(supabase) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return null;

    const { data: userProfile, error: profileError } = await supabase
        .from('gckitbut_users')
        .select('role')
        .eq('auth_user_id', user.id)
        .single();

    return userProfile ? userProfile.role : null;
}

export async function GET(request: Request) {
    const supabase = await getSupabase();
    const role = await getCurrentUserRole(supabase);

    if (role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Perform all count queries in parallel
    const today = new Date().toISOString().split('T')[0];

    const [
        { count: total_users },
        { count: total_buses },
        { count: total_routes },
        { count: today_reservations }
    ] = await Promise.all([
        supabase.from('gckitbut_users').select('*', { count: 'exact', head: true }),
        supabase.from('gckitbut_buses').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('gckitbut_bus_routes').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('gckitbut_reservations').select('*', { count: 'exact', head: true })
            .eq('reservation_date', today)
            .eq('status', 'confirmed')
    ]);

    return NextResponse.json({
        total_users,
        total_buses,
        total_routes,
        today_reservations
    });
}
