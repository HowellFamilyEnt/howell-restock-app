import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME } from "@/lib/accessLinks";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";
  // /wo/[token] is the unauthenticated crew-facing work order link - the
  // token itself is the access control, not a session (see
  // src/app/wo/[token]/page.tsx).
  const isPublicWorkOrder = req.nextUrl.pathname.startsWith("/wo/");
  // /access/[token] and /access/exit set/clear the no-login section-access
  // cookie - see src/app/access/*/route.ts.
  const isAccessRoute = req.nextUrl.pathname.startsWith("/access/");
  // /cleaning/[token] is the unauthenticated crew-facing "flag a low/out
  // item" form - the token itself is the access control, not a session
  // (see src/app/cleaning/[token]/page.tsx).
  const isCleaningRoute = req.nextUrl.pathname.startsWith("/cleaning/");
  // /guest/[token] is the unauthenticated guest portal - same
  // token-is-the-access-control shape as the two routes above (see
  // src/app/guest/[token]/page.tsx).
  const isGuestRoute = req.nextUrl.pathname.startsWith("/guest/");
  // /upgrade-review/[token] is the unauthenticated staff review page
  // linked from Slack - same token-is-the-access-control shape (see
  // src/app/upgrade-review/[token]/page.tsx).
  const isUpgradeReviewRoute = req.nextUrl.pathname.startsWith("/upgrade-review/");
  // /privacy and /sms-terms are the public legal pages required for
  // Twilio's A2P 10DLC campaign registration - no login, no token, just
  // plain public pages (see src/app/privacy/page.tsx, src/app/sms-terms/page.tsx).
  const isLegalRoute = req.nextUrl.pathname === "/privacy" || req.nextUrl.pathname === "/sms-terms";
  // Presence only - the (dashboard) layout does the real lookup (active?
  // which sections?) since that needs Prisma, which middleware shouldn't
  // do on every request. An invalid/expired token just bounces to /login
  // there.
  const hasAccessCookie = req.cookies.has(ACCESS_COOKIE_NAME);

  if (
    !isLoggedIn &&
    !isLoginPage &&
    !isPublicWorkOrder &&
    !isAccessRoute &&
    !isCleaningRoute &&
    !isGuestRoute &&
    !isUpgradeReviewRoute &&
    !isLegalRoute &&
    !hasAccessCookie
  ) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/properties", req.nextUrl.origin));
  }

  // Exposes the current path to Server Components (the (dashboard) layout
  // uses it to figure out which section is being requested).
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
});

export const config = {
  // Every route under /api/ does its own auth (NextAuth's own handlers,
  // check-licenses' CRON_SECRET bearer check, the Hostaway webhook's Basic
  // Auth check) - excluding just api/auth left the other two redirected to
  // /login for any caller without a browser session, which is every
  // external caller they're meant to serve (Vercel Cron, Hostaway).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
