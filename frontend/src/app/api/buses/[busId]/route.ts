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

// GET a single bus by ID (public)
export async function GET(
  request: Request,
  { params }: { params: { busId: string } }
) {
    const busId = parseInt(params.busId, 10);
    if (isNaN(busId)) {
        return NextResponse.json({ error: 'Invalid bus ID' }, { status: 400 });
    }

    const supabase = await getSupabase();
    const { data, error } = await supabase
        .from('gckitbut_buses')
        .select(`*, route:gckitbut_bus_routes(*)`)
        .eq('id', busId)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: 'Bus not found' }, { status: 404 });
    }

    return NextResponse.json(data);
}

// PUT to update a bus (admin only)
export async function PUT(
  request: Request,
  { params }: { params: { busId: string } }
) {
  const busId = parseInt(params.busId, 10);
  if (isNaN(busId)) {
    return NextResponse.json({ error: 'Invalid bus ID' }, { status: 400 });
  }

  const supabase = await getSupabase();
  const role = await getCurrentUserRole(supabase);

  if (role !== 'admin') {
    return NextResponse.json({ error: 'Not enough permissions' }, { status: 403 });
  }

  const busUpdateData = await request.json();

  const { data, error } = await supabase
    .from('gckitbut_buses')
    .update(busUpdateData)
    .eq('id', busId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: `Bus not found or failed to update: ${error.message}` }, { status: 404 });
  }

  return NextResponse.json(data);
}

// DELETE a bus (admin only)
export async function DELETE(
  request: Request,
  { params }: { params: { busId: string } }
) {
  const busId = parseInt(params.busId, 10);
  if (isNaN(busId)) {
    return NextResponse.json({ error: 'Invalid bus ID' }, { status: 400 });
  }

  const supabase = await getSupabase();
  const role = await getCurrentUserRole(supabase);

  if (role !== 'admin') {
    return NextResponse.json({ error: 'Not enough permissions' }, { status: 403 });
  }

  // Soft delete by setting is_active to false
  const { error } = await supabase
    .from('gckitbut_buses')
    .update({ is_active: false })
    .eq('id', busId);

  if (error) {
    return NextResponse.json({ error: `Bus not found or failed to delete: ${error.message}` }, { status: 404 });
  }

  return NextResponse.json({ message: 'Bus deleted successfully' });
}
