import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

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

export async function GET(request: NextRequest) {
  const supabase = await getSupabase();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || currentUser.role !== 'driver') {
    return NextResponse.json({ error: 'Only drivers can access this endpoint' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const reservationDate = searchParams.get('reservation_date') || new Date().toISOString().split('T')[0];

  const { data: bus, error } = await supabase
    .from('gckitbut_buses')
    .select('*, route:gckitbut_bus_routes(*)')
    .eq('driver_id', currentUser.id)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (error || !bus) {
    return NextResponse.json({ error: 'No bus assigned to this driver' }, { status: 404 });
  }

  // Calculate seat availability
  const { count, error: countError } = await supabase
      .from('gckitbut_reservations')
      .select('*', { count: 'exact', head: true })
      .eq('bus_id', bus.id)
      .eq('reservation_date', reservationDate)
      .eq('status', 'confirmed');

  const reservedCount = countError ? 0 : count;
  const availableSeats = bus.total_seats - reservedCount;
  const occupancyRate = bus.total_seats > 0 ? (reservedCount / bus.total_seats) * 100 : 0;

  const result = {
      id: bus.id,
      bus_number: bus.bus_number,
      route: `${bus.route.departure_location} → ${bus.route.destination}`,
      departure_time: bus.departure_time,
      arrival_time: bus.arrival_time,
      destination: bus.route.destination,
      bus_type: `${bus.total_seats}-seat`,
      total_seats: bus.total_seats,
      available_seats: availableSeats,
      occupancy_rate: Math.round(occupancyRate * 10) / 10,
  };

  return NextResponse.json(result);
}
