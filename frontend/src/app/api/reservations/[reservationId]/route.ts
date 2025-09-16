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

// Helper to get a reservation and check permissions
async function getReservationAndCheckPerms(supabase, reservationId, currentUser) {
    const { data: reservation, error } = await supabase
        .from('gckitbut_reservations')
        .select('*')
        .eq('id', reservationId)
        .single();

    if (error || !reservation) {
        return { reservation: null, error: 'Reservation not found' };
    }

    if (currentUser.role !== 'admin' && reservation.user_id !== currentUser.id) {
        return { reservation: null, error: 'Not enough permissions' };
    }

    return { reservation, error: null };
}

// GET a single reservation
export async function GET(
  request: Request,
  { params }: { params: { reservationId: string } }
) {
    const reservationId = parseInt(params.reservationId, 10);
    if (isNaN(reservationId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const supabase = await getSupabase();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { reservation, error } = await getReservationAndCheckPerms(supabase, reservationId, currentUser);
    if (error) {
        return NextResponse.json({ error }, { status: error === 'Reservation not found' ? 404 : 403 });
    }
    return NextResponse.json(reservation);
}


// PUT to update a reservation (e.g., change status)
export async function PUT(
  request: Request,
  { params }: { params: { reservationId: string } }
) {
    const reservationId = parseInt(params.reservationId, 10);
    if (isNaN(reservationId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const supabase = await getSupabase();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { reservation, error: permError } = await getReservationAndCheckPerms(supabase, reservationId, currentUser);
    if (permError) {
        return NextResponse.json({ error: permError }, { status: permError === 'Reservation not found' ? 404 : 403 });
    }

    const updateData = await request.json();
    // Ensure only certain fields can be updated
    const { status } = updateData;
    const dataToUpdate: { status: string, cancelled_by?: number } = { status };

    if (status === 'cancelled') {
        dataToUpdate.cancelled_by = currentUser.id;
    }

    const { data: updatedReservation, error: updateError } = await supabase
        .from('gckitbut_reservations')
        .update(dataToUpdate)
        .eq('id', reservationId)
        .select()
        .single();

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(updatedReservation);
}

// DELETE to cancel a reservation
export async function DELETE(
  request: Request,
  { params }: { params: { reservationId: string } }
) {
    const reservationId = parseInt(params.reservationId, 10);
    if (isNaN(reservationId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const supabase = await getSupabase();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { reservation, error: permError } = await getReservationAndCheckPerms(supabase, reservationId, currentUser);
    if (permError) {
        return NextResponse.json({ error: permError }, { status: permError === 'Reservation not found' ? 404 : 403 });
    }

    const { error: deleteError } = await supabase
        .from('gckitbut_reservations')
        .update({ status: 'cancelled', cancelled_by: currentUser.id })
        .eq('id', reservationId);

    if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Reservation cancelled successfully' });
}
