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

// GET all buses with availability
export async function GET(request: NextRequest) {
  const supabase = await getSupabase();
  const { searchParams } = new URL(request.url);
  const destination = searchParams.get('destination');
  const reservationDate = searchParams.get('reservation_date') || new Date().toISOString().split('T')[0];

  let query = supabase
    .from('gckitbut_buses')
    .select(`
      id,
      bus_number,
      bus_type,
      total_seats,
      departure_time,
      arrival_time,
      route:gckitbut_bus_routes (
        departure_location,
        destination
      )
    `)
    .eq('is_active', true);

  if (destination) {
    query = query.eq('route.destination', destination);
  }

  const { data: buses, error: busesError } = await query;

  if (busesError) {
    return NextResponse.json({ error: busesError.message }, { status: 500 });
  }

  // Now, for each bus, get the reservation count
  const results = await Promise.all(buses.map(async (bus) => {
    const { count, error: countError } = await supabase
      .from('gckitbut_reservations')
      .select('*', { count: 'exact', head: true })
      .eq('bus_id', bus.id)
      .eq('reservation_date', reservationDate)
      .eq('status', 'confirmed');

    const reservedCount = countError ? 0 : count;
    const availableSeats = bus.total_seats - reservedCount;
    const occupancyRate = bus.total_seats > 0 ? (reservedCount / bus.total_seats) * 100 : 0;

    return {
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
  }));

  return NextResponse.json(results);
}

// POST to create a new bus (admin only)
export async function POST(request: Request) {
    const supabase = await getSupabase();
    const role = await getCurrentUserRole(supabase);

    if (role !== 'admin') {
        return NextResponse.json({ error: 'Not enough permissions' }, { status: 403 });
    }

    const busData = await request.json();

    const { data, error } = await supabase
        .from('gckitbut_buses')
        .insert(busData)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
}
