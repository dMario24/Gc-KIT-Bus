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
        .select('id, full_name, phone')
        .eq('auth_user_id', user.id)
        .single();

    return userProfile;
}

// GET reservations for the current user with detailed formatting
export async function GET(request: Request) {
    const supabase = await getSupabase();
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: reservations, error } = await supabase
        .from('gckitbut_reservations')
        .select(`
            id,
            user_id,
            bus_id,
            seat_number,
            reservation_date,
            status,
            bus:gckitbut_buses (
                bus_number,
                departure_time,
                bus_type,
                route:gckitbut_bus_routes (
                    departure_location,
                    destination
                )
            )
        `)
        .eq('user_id', currentUser.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format the response to match the old API
    const result = reservations.map(res => ({
        id: res.id,
        user_id: res.user_id,
        bus_id: res.bus_id,
        seat_number: res.seat_number,
        reservation_date: res.reservation_date,
        departure_time: res.bus.departure_time,
        status: res.status,
        bus_number: res.bus.bus_number,
        route: `${res.bus.route.departure_location} → ${res.bus.route.destination}`,
        bus_type: res.bus.bus_type,
        full_name: currentUser.full_name,
        phone: currentUser.phone
    }));

    return NextResponse.json(result);
}
