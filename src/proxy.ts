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
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
