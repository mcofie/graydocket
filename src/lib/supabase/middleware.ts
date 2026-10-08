import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })
  const isProtectedPath =
    request.nextUrl.pathname.startsWith('/admin') ||
    request.nextUrl.pathname.startsWith('/dashboard')
  const isDevelopment = process.env.NODE_ENV === 'development'

  // Skip auth check if Supabase is not configured (dev mode)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'your-supabase-url') {
    if (isProtectedPath && !isDevelopment) {
      return new NextResponse('Application configuration error.', { status: 503 })
    }
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      db: {
        schema: 'graydocket',
      },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getClaims verifies the session JWT (locally when the project uses asymmetric signing keys)
  // and refreshes an expired session, avoiding an Auth server round trip on most requests.
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const user = claims?.sub ? { id: claims.sub, app_metadata: claims.app_metadata as { role?: string } | undefined } : null

  const isScanningAdmin = request.nextUrl.pathname.startsWith('/admin')
  const authPaths = ['/auth/login', '/auth/register']
  const isAuthPath = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  // The role only matters for admin routes and for choosing where to send signed-in users from auth pages
  let role = 'user'
  let isAdminRole = false

  if (user && (isScanningAdmin || isAuthPath)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    role = profile?.role || user.app_metadata?.role || 'user'
    isAdminRole = ['admin', 'registrar', 'bank_manager', 'service_manager'].includes(role)
  }

  // Protected paths logic: Only redirect AWAY from /admin if we are CERTAIN they are not an admin
  if (isScanningAdmin && user && !isAdminRole && role === 'user') {
    // We only redirect if we explicitly fetched 'user' and not an admin role
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  if (isScanningAdmin && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.search = ''
    url.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(url)
  }

  // Redirect logged-in users away from auth pages
  if (isAuthPath && user) {
    // Honour a same-site ?redirect= (e.g. from the public quiz) so signed-in users land where they meant to go
    const redirectParam = request.nextUrl.searchParams.get('redirect')
    const safeRedirect = redirectParam?.startsWith('/') && !redirectParam.startsWith('//') ? redirectParam : null
    if (safeRedirect && !isAdminRole) {
      return NextResponse.redirect(new URL(safeRedirect, request.url))
    }
    const url = request.nextUrl.clone()
    url.pathname = isAdminRole ? '/admin' : '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
