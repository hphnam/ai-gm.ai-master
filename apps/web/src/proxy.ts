import { type NextRequest, NextResponse } from 'next/server'

/// Instant cookie-only auth gate at the edge. Cookie name is set by
/// better-auth's `cookiePrefix: 'gm_ai'` (apps/api/src/modules/auth/auth.config.ts).
///
/// Proxy only checks the cookie's presence — it doesn't validate the
/// session. That's good enough to skip the wasted round-trip on logged-out
/// users (95% of them have no cookie). Stale cookies still hit the layout's
/// full session check, which redirects to sign-in if the session is invalid.
///
/// Pairs with apps/web/src/app/(app)/layout.tsx which adds the venue gate.
/// File convention: Next.js 16 renamed `middleware.ts` → `proxy.ts`, and the
/// default export must be named `proxy` (not `middleware`).
const SESSION_COOKIE_NAMES = ['gm_ai.session_token', '__Secure-gm_ai.session_token']

function hasSessionCookie(req: NextRequest): boolean {
  return SESSION_COOKIE_NAMES.some((n) => req.cookies.has(n))
}

export function proxy(req: NextRequest) {
  if (hasSessionCookie(req)) return NextResponse.next()

  const { pathname, search } = req.nextUrl
  const target = req.nextUrl.clone()
  target.pathname = '/auth/sign-in'
  target.search = ''
  target.searchParams.set('redirect', pathname + search)
  return NextResponse.redirect(target)
}

/// Match the gated app surface. /welcome, /auth, /onboard, /venues/new, and
/// /settings handle their own auth (some are intentionally accessible while
/// onboarding).
export const config = {
  matcher: [
    '/chat/:path*',
    '/tasks/:path*',
    '/docs/:path*',
    '/compliance/:path*',
    '/reports/:path*',
  ],
}
