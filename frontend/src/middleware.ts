import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user }, } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Define protected routes for each role
  const protectedRoutes = {
    admin: '/admin',
    driver: '/driver',
    user: '/user',
  }

  if (user) {
    // If user is logged in, fetch their role from the public table
    const { data: userProfile } = await supabase
      .from('gckitbut_users')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()

    const userRole = userProfile?.role

    if (pathname.startsWith('/login')) {
      // If logged-in user tries to access login page, redirect to their dashboard
      const redirectUrl = userRole ? protectedRoutes[userRole] : '/';
      return NextResponse.redirect(new URL(redirectUrl, request.url))
    }

    // Check if user is accessing a route they are not supposed to
    if (userRole) {
        const allowedPath = protectedRoutes[userRole];
        // If user is not in their allowed path, and not in a subpath of it, redirect them
        if (!pathname.startsWith(allowedPath) && !pathname.startsWith('/api')) {
             // Allow access to root path
            if (pathname === '/') return response;

            console.log(`Redirecting user with role ${userRole} from ${pathname} to ${allowedPath}`);
            return NextResponse.redirect(new URL(allowedPath, request.url));
        }
    }

  } else {
    // If user is not logged in, protect all routes except for the login page
    const isProtectedRoute = Object.values(protectedRoutes).some(path => pathname.startsWith(path));
    if (isProtectedRoute) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
}
