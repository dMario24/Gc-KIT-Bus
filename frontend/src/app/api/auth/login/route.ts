import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const cookieStore = cookies();

  const supabase = createServerClient(
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

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  // On successful login, Supabase sets the auth cookie automatically.
  // We can fetch the user's public profile to return it.
  const { data: userProfile, error: profileError } = await supabase
    .from('gckitbut_users')
    .select('*')
    .eq('auth_user_id', data.user.id)
    .single();

  if (profileError) {
      // Even if the public profile is missing, login was successful.
      // Return the auth user data.
      return NextResponse.json({ message: "Login successful, but public profile not found.", user: data.user });
  }

  return NextResponse.json({ ...data, user: userProfile });
}
