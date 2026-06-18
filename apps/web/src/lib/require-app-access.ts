import { redirect } from 'next/navigation'
import { getServerSession, type ServerSession } from './server-session'
import { getServerVenues } from './server-venues'

/// Shared server-side gate for the authenticated app surface. Called once by
/// the `(app)/layout.tsx` route-group layout, not per page.
///
/// Middleware (apps/web/src/middleware.ts) does the instant cookie-only
/// check at the edge — if no session cookie is present the request never
/// reaches this layout. So this function only handles two cases:
/// - Session cookie present but no valid session on the API → punt to
///   sign-in. (Cookie was stale; middleware can't tell.)
/// - Session valid but zero venues → punt to /welcome so onboarding can run.
///
/// On a transient venue-fetch failure (null), we let the page render and let
/// the client-side useVenues hook handle the empty case rather than block
/// every nav on a flaky network.
export async function requireAppAccess(): Promise<ServerSession> {
  const [session, venues] = await Promise.all([getServerSession(), getServerVenues()])
  if (!session) redirect('/auth/sign-in')
  if (venues === null) {
    // Logged-in but the /venues call failed (API down, network blip). We let
    // the page render rather than punt to /welcome — useVenues on the client
    // will surface the failure normally. Log so a sustained outage shows up.
    console.error('[requireAppAccess] venues fetch failed for', session.user.id)
  } else if (venues.length === 0) {
    redirect('/welcome')
  }
  return session
}
