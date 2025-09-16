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

// GET reservations (role-based)
export async function GET(request: Request) {
    const supabase = await getSupabase();
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let query;
    if (currentUser.role === 'admin') {
        // Admin sees all reservations
        query = supabase.from('gckitbut_reservations').select('*, bus:gckitbut_buses(*, route:gckitbut_bus_routes(*)), user:gckitbut_users(*)');
    } else if (currentUser.role === 'driver') {
        // Driver sees reservations for their buses
        const { data: driverBuses, error: busError } = await supabase
            .from('gckitbut_buses')
            .select('id')
            .eq('driver_id', currentUser.id);

        if (busError || !driverBuses) {
            return NextResponse.json({ error: 'Could not fetch driver buses' }, { status: 500 });
        }
        const busIds = driverBuses.map(b => b.id);
        query = supabase.from('gckitbut_reservations').select('*, bus:gckitbut_buses(*), user:gckitbut_users(full_name, phone)')
            .in('bus_id', busIds);
    } else {
        // User sees their own reservations
        query = supabase.from('gckitbut_reservations').select('*, bus:gckitbut_buses(*, route:gckitbut_bus_routes(*))')
            .eq('user_id', currentUser.id);
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}


// POST to create new reservations
export async function POST(request: Request) {
    const supabase = await getSupabase();
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { bus_id, seat_numbers, reservation_date } = await request.json();

    if (!bus_id || !seat_numbers || !seat_numbers.length || !reservation_date) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check for conflicts
    const { data: existing, error: conflictError } = await supabase
        .from('gckitbut_reservations')
        .select('seat_number')
        .eq('bus_id', bus_id)
        .eq('reservation_date', reservation_date)
        .eq('status', 'confirmed')
        .in('seat_number', seat_numbers);

    if (conflictError) {
        return NextResponse.json({ error: `Conflict check failed: ${conflictError.message}`}, { status: 500 });
    }
    if (existing && existing.length > 0) {
        const reservedSeats = existing.map(r => r.seat_number);
        return NextResponse.json({ error: `Seats already reserved: ${reservedSeats.join(', ')}` }, { status: 400 });
    }

    // Create reservation records
    const reservationsToCreate = seat_numbers.map(seat => ({
        user_id: currentUser.id,
        bus_id: bus_id,
        seat_number: seat,
        reservation_date: reservation_date,
        status: 'confirmed',
    }));

    const { data: createdReservations, error: createError } = await supabase
        .from('gckitbut_reservations')
        .insert(reservationsToCreate)
        .select();

    if (createError) {
        return NextResponse.json({ error: `Failed to create reservations: ${createError.message}` }, { status: 500 });
    }

    return NextResponse.json(createdReservations);
}
