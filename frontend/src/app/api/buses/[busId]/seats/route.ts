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

export async function GET(
  request: NextRequest,
  { params }: { params: { busId: string } }
) {
    const busId = parseInt(params.busId, 10);
    if (isNaN(busId)) {
        return NextResponse.json({ error: 'Invalid bus ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const reservationDate = searchParams.get('reservation_date');
    if (!reservationDate) {
        return NextResponse.json({ error: 'reservation_date query parameter is required' }, { status: 400 });
    }

    const supabase = await getSupabase();

    // First, get the bus details
    const { data: bus, error: busError } = await supabase
        .from('gckitbut_buses')
        .select('id, total_seats, bus_type')
        .eq('id', busId)
        .single();

    if (busError || !bus) {
        return NextResponse.json({ error: 'Bus not found' }, { status: 404 });
    }

    // Get reserved seats for the date
    const { data: reservations, error: reservationsError } = await supabase
        .from('gckitbut_reservations')
        .select('seat_number')
        .eq('bus_id', busId)
        .eq('reservation_date', reservationDate)
        .eq('status', 'confirmed');

    if (reservationsError) {
        return NextResponse.json({ error: reservationsError.message }, { status: 500 });
    }

    const reservedSeatNumbers = reservations.map(r => r.seat_number);

    return NextResponse.json({
        bus_id: bus.id,
        bus_type: bus.bus_type,
        total_seats: bus.total_seats,
        reserved_seats: reservedSeatNumbers.length,
        available_seats: bus.total_seats - reservedSeatNumbers.length,
        reserved_seat_numbers: reservedSeatNumbers,
    });
}
