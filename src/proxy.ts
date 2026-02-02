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

  // 1. Define Route Categories
  const isAuthRoute = url.pathname.startsWith('/auth/')
  const isDashboardRoute = url.pathname.startsWith('/dashboard')
  const isCheckEmailPage = url.pathname === '/check-email'
  
  // Public pages that anyone can see
  const isPublicPage = url.pathname === '/login' || 
                       url.pathname === '/signup' || 
                       url.pathname === '/landing' || 
                       url.pathname === '/'

  // 2. Allow Internal Auth & Email Check routes to pass through
  if (isAuthRoute || isCheckEmailPage) {
    return response
  }

  // 3. Handle Public Pages (Landing, Login, Signup)
  if (isPublicPage) {
    // If user is already logged in, don't show landing/login - send to dashboard
    if (user) {
      console.log("User logged in - skipping public page:", url.pathname)
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    // If not logged in, they can see the landing/login/signup pages
    return response
  }

  // 4. Protect Dashboard (and any other internal routes)
  if (!user && isDashboardRoute) {
    console.log("Unauthorized - redirecting to login")
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 5. Default Fallback
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (svg, png, jpg, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}