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

// POST for admin to create a reservation for a user
export async function POST(request: Request) {
    const supabase = await getSupabase();
    const role = await getCurrentUserRole(supabase);

    if (role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { user_id, bus_id, seat_numbers, reservation_date } = await request.json();

    if (!user_id || !bus_id || !seat_numbers || !seat_numbers.length || !reservation_date) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Since this is an admin action, we bypass the RLS that prevents users from booking for others.
    // We can do this by using the service_role key if available, or by temporarily disabling RLS for the transaction.
    // For now, we assume the RLS is permissive enough for an admin role, or we use a helper function.
    // Let's create the reservations directly.

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

    const reservationsToCreate = seat_numbers.map(seat => ({
        user_id: user_id,
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
        // The error message might indicate an RLS issue.
        return NextResponse.json({ error: `Failed to create reservations: ${createError.message}` }, { status: 500 });
    }

    return NextResponse.json(createdReservations);
}
