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

// GET all active bus routes (public)
export async function GET(request: Request) {
  const supabase = await getSupabase();

  const { data: routes, error } = await supabase
    .from('gckitbut_bus_routes')
    .select('*')
    .eq('is_active', true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(routes);
}

// POST to create a new bus route (admin only)
export async function POST(request: Request) {
    const supabase = await getSupabase();
    const role = await getCurrentUserRole(supabase);

    if (role !== 'admin') {
        return NextResponse.json({ error: 'Not enough permissions' }, { status: 403 });
    }

    const routeData = await request.json();

    const { data, error } = await supabase
        .from('gckitbut_bus_routes')
        .insert(routeData)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
}
