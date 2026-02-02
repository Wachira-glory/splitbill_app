import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export default async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storageKey: 'splitbill-v1-auth',
        persistSession: true,
      },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) => 
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const url = request.nextUrl.clone()

  console.log("Proxy Check - User:", !!user, "| Path:", url.pathname)

  // Allow all auth routes to pass through (including /auth/callback)
  const isAuthRoute = url.pathname.startsWith('/auth/')
  const isDashboardRoute = url.pathname.startsWith('/dashboard')
  const isAuthPage = url.pathname === '/login' || url.pathname === '/signup'
  const isCheckEmailPage = url.pathname === '/check-email'

  // Let all auth-related routes pass through without interference
  if (isAuthRoute || isCheckEmailPage) {
    return response
  }

  // Protect dashboard routes - redirect to login if not authenticated
  if (!user && isDashboardRoute) {
    console.log("Protecting dashboard - redirecting to login")
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If logged in and trying to access login/signup, redirect to dashboard
  if (user && isAuthPage) {
    console.log("User already logged in - redirecting to dashboard")
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Allow the request to continue
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}