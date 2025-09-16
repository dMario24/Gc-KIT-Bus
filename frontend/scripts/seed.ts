import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs'; // We need this to hash passwords for the `hashed_password` column, even if Supabase handles auth.

// DO NOT EXPOSE THIS IN THE BROWSER
// This script should be run in a secure environment (e.g., your local machine)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Supabase URL or Service Key is missing. Make sure to set them in your environment.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('🚀 Seeding database...');

  // 1. Create Demo Users in Supabase Auth and our public table
  const usersToCreate = [
    {
      email: 'admin@company.com',
      password: 'admin123',
      userData: {
        username: 'admin',
        full_name: '관리자',
        phone: '02-1234-5678',
        role: 'admin',
        hashed_password: await bcrypt.hash('admin123', 10)
      }
    },
    {
      email: 'driver1@company.com',
      password: 'driver123',
      userData: {
        username: 'driver1',
        full_name: '김기사',
        phone: '010-1111-2222',
        role: 'driver',
        hashed_password: await bcrypt.hash('driver123', 10)
      }
    },
    {
      email: 'user1@company.com',
      password: 'user123',
      userData: {
        username: 'user1',
        full_name: '홍길동',
        phone: '010-3333-4444',
        role: 'user',
        hashed_password: await bcrypt.hash('user123', 10)
      }
    }
  ];

  const createdUsers = [];
  for (const user of usersToCreate) {
    // Create user in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true, // Auto-confirm email for seeding
    });

    if (authError) {
      console.error(`Error creating auth user ${user.email}:`, authError.message);
      // If user already exists, try to get them
      if (authError.message.includes('already exists')) {
          const {data: existingUser, error: getUserError} = await supabase.auth.admin.listUsers({email: user.email});
          if(getUserError || !existingUser.users.length) {
              console.error(`Could not retrieve existing user ${user.email}`);
              continue;
          }
          const { data: publicProfile, error: profileError } = await supabase
            .from('gckitbut_users')
            .select('id')
            .eq('email', user.email)
            .single();
          if (publicProfile) {
            createdUsers.push({ ...user.userData, id: publicProfile.id });
            console.log(`User ${user.email} already exists, skipping creation.`);
            continue;
          }
          authUser.user = existingUser.users[0];
      } else {
        continue;
      }
    }

    // Create corresponding user in public.gckitbut_users
    const { data: publicUser, error: publicUserError } = await supabase
      .from('gckitbut_users')
      .insert({
        auth_user_id: authUser.user.id,
        email: user.email,
        ...user.userData,
      })
      .select()
      .single();

    if (publicUserError) {
      console.error(`Error creating public user profile for ${user.email}:`, publicUserError.message);
      // If we failed to create the public profile, delete the auth user to keep things clean
      await supabase.auth.admin.deleteUser(authUser.user.id);
      continue;
    }

    createdUsers.push(publicUser);
    console.log(`✅ Created user: ${user.email}`);
  }

  const getUserId = (username) => {
      const user = createdUsers.find(u => u.username === username);
      return user ? user.id : null;
  };

  // 2. Create Demo Bus Routes
  const routesToCreate = [
    { name: '강남-판교선', departure_location: '강남', destination: '판교 테크노밸리' },
    { name: '잠실-강남선', departure_location: '잠실', destination: '강남역' },
    { name: '서울역-여의도선', departure_location: '서울역', destination: '여의도 IFC' }
  ];

  const { data: createdRoutes, error: routesError } = await supabase
    .from('gckitbut_bus_routes')
    .upsert(routesToCreate, { onConflict: 'name' })
    .select();

  if (routesError) {
    console.error('Error seeding bus routes:', routesError.message);
    return;
  }
  console.log('✅ Seeded bus routes');

  const getRouteId = (name) => {
      const route = createdRoutes.find(r => r.name === name);
      return route ? route.id : null;
  }

  // 3. Create Demo Buses
  const busesToCreate = [
    { bus_number: 'BUS-001', route_id: getRouteId('강남-판교선'), departure_time: '08:00:00', arrival_time: '08:45:00', total_seats: 45, bus_type: '45-seat', driver_id: getUserId('driver1') },
    { bus_number: 'BUS-002', route_id: getRouteId('잠실-강남선'), departure_time: '08:30:00', arrival_time: '09:15:00', total_seats: 28, bus_type: '28-seat', driver_id: getUserId('driver1') },
    { bus_number: 'BUS-003', route_id: getRouteId('서울역-여의도선'), departure_time: '07:45:00', arrival_time: '08:20:00', total_seats: 45, bus_type: '45-seat', driver_id: getUserId('driver1') }
  ];

  const { error: busesError } = await supabase
    .from('gckitbut_buses')
    .upsert(busesToCreate, { onConflict: 'bus_number' });

  if (busesError) {
    console.error('Error seeding buses:', busesError.message);
    return;
  }
  console.log('✅ Seeded buses');

  // Note: Demo reservations are not created in this script as they are date-sensitive.
  // They can be created via the UI after logging in as a demo user.

  console.log('✨ Seeding finished successfully!');
}

main().catch(console.error);
