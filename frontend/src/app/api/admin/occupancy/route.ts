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

export async function GET(request: NextRequest) {
    const supabase = await getSupabase();
    const role = await getCurrentUserRole(supabase);

    if (role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const reservationDate = searchParams.get('reservation_date') || new Date().toISOString().split('T')[0];

    const { data: buses, error: busesError } = await supabase
        .from('gckitbut_buses')
        .select(`
            id,
            bus_number,
            total_seats,
            route:gckitbut_bus_routes ( name )
        `)
        .eq('is_active', true);

    if (busesError) {
        return NextResponse.json({ error: busesError.message }, { status: 500 });
    }

    const occupancyStats = await Promise.all(buses.map(async (bus) => {
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
            bus_id: bus.id,
            bus_number: bus.bus_number,
            route: bus.route ? bus.route.name : 'Unknown',
            total_seats: bus.total_seats,
            reserved_seats: reservedCount,
            available_seats: availableSeats,
            occupancy_rate: Math.round(occupancyRate * 100) / 100,
        };
    }));

    return NextResponse.json({
        date: reservationDate,
        buses: occupancyStats,
    });
}
