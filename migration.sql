-- Enum Types
CREATE TYPE gckitbut_user_role AS ENUM ('user', 'admin', 'driver');
CREATE TYPE gckitbut_bus_type AS ENUM ('28-seat', '45-seat');
CREATE TYPE gckitbut_reservation_status AS ENUM ('confirmed', 'cancelled', 'completed');

-- Users Table
-- This table stores public user data.
-- It is linked to the auth.users table via the auth_user_id column.
CREATE TABLE gckitbut_users (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Foreign key to Supabase auth users
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL, -- This might become redundant if we fully rely on Supabase Auth, but let's keep it for migration.
    full_name TEXT NOT NULL,
    phone TEXT,
    role gckitbut_user_role NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE gckitbut_users IS '사용자 정보. Supabase auth.users와 연결됩니다.';

-- Bus Routes Table
CREATE TABLE gckitbut_bus_routes (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    departure_location TEXT NOT NULL,
    destination TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE gckitbut_bus_routes IS '버스 노선 정보';

-- Buses Table
CREATE TABLE gckitbut_buses (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    bus_number TEXT UNIQUE NOT NULL,
    route_id BIGINT NOT NULL REFERENCES gckitbut_bus_routes(id),
    driver_id BIGINT REFERENCES gckitbut_users(id),
    bus_type gckitbut_bus_type NOT NULL DEFAULT '28-seat',
    total_seats INTEGER NOT NULL DEFAULT 28,
    departure_time TIME NOT NULL,
    arrival_time TIME NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE gckitbut_buses IS '버스 정보';

-- Reservations Table
CREATE TABLE gckitbut_reservations (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id BIGINT NOT NULL REFERENCES gckitbut_users(id),
    bus_id BIGINT NOT NULL REFERENCES gckitbut_buses(id),
    seat_number VARCHAR(10) NOT NULL,
    reservation_date DATE NOT NULL,
    status gckitbut_reservation_status NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_by BIGINT REFERENCES gckitbut_users(id)
);
COMMENT ON TABLE gckitbut_reservations IS '예약 정보';

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION gckitbut_trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at on table updates
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON gckitbut_users
FOR EACH ROW
EXECUTE FUNCTION gckitbut_trigger_set_timestamp();

CREATE TRIGGER set_reservations_updated_at
BEFORE UPDATE ON gckitbut_reservations
FOR EACH ROW
EXECUTE FUNCTION gckitbut_trigger_set_timestamp();

-- Enable RLS for all tables
ALTER TABLE gckitbut_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE gckitbut_bus_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE gckitbut_buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE gckitbut_reservations ENABLE ROW LEVEL SECURITY;

-- Helper function to get user id from auth.uid()
CREATE OR REPLACE FUNCTION gckitbut_get_user_id()
RETURNS BIGINT AS $$
DECLARE
  user_id_val BIGINT;
BEGIN
  SELECT id INTO user_id_val FROM public.gckitbut_users WHERE auth_user_id = auth.uid();
  RETURN user_id_val;
END;
$$ LANGUAGE plpgsql;


-- POLICIES

-- Policies for public access
CREATE POLICY "Public read access for bus routes" ON gckitbut_bus_routes FOR SELECT USING (true);
CREATE POLICY "Public read access for buses" ON gckitbut_buses FOR SELECT USING (true);

-- Policies for users
-- Users can view any user's public profile info (for now, can be restricted later)
CREATE POLICY "Allow read access to all users" ON gckitbut_users FOR SELECT USING (true);

-- Users can only insert their own user record.
-- The `auth_user_id` must match the currently authenticated user's `uid`.
CREATE POLICY "Users can insert their own user record" ON gckitbut_users FOR INSERT WITH CHECK (auth_user_id = auth.uid());
-- Users can only update their own record.
CREATE POLICY "Users can update their own user record" ON gckitbut_users FOR UPDATE USING (auth_user_id = auth.uid());


-- Policies for reservations
-- Users can view their own reservations.
CREATE POLICY "Users can view their own reservations" ON gckitbut_reservations FOR SELECT USING (user_id = gckitbut_get_user_id());
-- Users can create reservations for themselves.
CREATE POLICY "Users can create their own reservations" ON gckitbut_reservations FOR INSERT WITH CHECK (user_id = gckitbut_get_user_id());
-- Users can cancel (update) their own reservations.
CREATE POLICY "Users can update their own reservations" ON gckitbut_reservations FOR UPDATE USING (user_id = gckitbut_get_user_id());
