import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  const { email, password, username, full_name, phone, role } = await request.json();
  const cookieStore = cookies();

  // The createServerClient needs the cookieStore and Supabase credentials
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

  // First, check if username or email already exists in our public table
  const { data: existingUser, error: existingUserError } = await supabase
    .from('gckitbut_users')
    .select('id')
    .or(`username.eq.${username},email.eq.${email}`)
    .single();

  if (existingUser) {
    return NextResponse.json({ error: 'Username or email already registered' }, { status: 400 });
  }

  // Sign up the user in Supabase Auth
  // We need the service_role key to do this from a server component, especially to auto-confirm users
  // For now, we proceed, but this might require creating a temporary admin client
  const { data: { user }, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // This data will be available in the user's `user_metadata`
      data: {
        username,
        full_name,
      }
    },
  });

  if (signUpError) {
    return NextResponse.json({ error: signUpError.message }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: 'User registration failed, user object not returned.' }, { status: 500 });
  }

  // Now, insert the public profile into our gckitbut_users table
  const hashedPassword = await bcrypt.hash(password, 10);

  const { data: publicProfile, error: profileError } = await supabase
    .from('gckitbut_users')
    .insert({
      auth_user_id: user.id,
      username,
      email,
      full_name,
      phone,
      role: role || 'user',
      hashed_password: hashedPassword,
    })
    .select()
    .single();

  if (profileError) {
    // If creating the public profile fails, we should delete the auth user
    // to prevent orphaned auth users. This requires an admin client.
    // This part of the logic highlights the need for the service_role key for robust error handling.
    console.error("CRITICAL: Failed to create public profile, but cannot delete auth user without service_role key. User is now orphaned:", user.id);
    return NextResponse.json({ error: `Failed to create user profile: ${profileError.message}. Please contact support.` }, { status: 500 });
  }

  // The user is created but needs to confirm their email.
  // The login will only work after confirmation.
  return NextResponse.json({ message: "Registration successful. Please check your email to confirm your account.", user: publicProfile });
}
