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

// PUT to update a bus route (admin only)
export async function PUT(
  request: Request,
  { params }: { params: { routeId: string } }
) {
  const routeId = parseInt(params.routeId, 10);
  if (isNaN(routeId)) {
    return NextResponse.json({ error: 'Invalid route ID' }, { status: 400 });
  }

  const supabase = await getSupabase();
  const role = await getCurrentUserRole(supabase);

  if (role !== 'admin') {
    return NextResponse.json({ error: 'Not enough permissions' }, { status: 403 });
  }

  const routeUpdateData = await request.json();

  const { data, error } = await supabase
    .from('gckitbut_bus_routes')
    .update(routeUpdateData)
    .eq('id', routeId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: `Route not found or failed to update: ${error.message}` }, { status: 404 });
  }

  return NextResponse.json(data);
}

// DELETE a bus route (admin only)
export async function DELETE(
  request: Request,
  { params }: { params: { routeId: string } }
) {
  const routeId = parseInt(params.routeId, 10);
  if (isNaN(routeId)) {
    return NextResponse.json({ error: 'Invalid route ID' }, { status: 400 });
  }

  const supabase = await getSupabase();
  const role = await getCurrentUserRole(supabase);

  if (role !== 'admin') {
    return NextResponse.json({ error: 'Not enough permissions' }, { status: 403 });
  }

  // Check if any buses are using this route
  const { data: busesInUse, error: checkError } = await supabase
    .from('gckitbut_buses')
    .select('id')
    .eq('route_id', routeId)
    .eq('is_active', true)
    .limit(1);

  if (checkError) {
      return NextResponse.json({ error: `Failed to check for buses: ${checkError.message}`}, {status: 500})
  }

  if (busesInUse && busesInUse.length > 0) {
      return NextResponse.json({ error: 'Cannot delete route that is in use by active buses' }, { status: 400 });
  }

  // Soft delete by setting is_active to false
  const { error: deleteError } = await supabase
    .from('gckitbut_bus_routes')
    .update({ is_active: false })
    .eq('id', routeId);

  if (deleteError) {
    return NextResponse.json({ error: `Route not found or failed to delete: ${deleteError.message}` }, { status: 404 });
  }

  return NextResponse.json({ message: 'Route deleted successfully' });
}
