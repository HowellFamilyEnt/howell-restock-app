import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";
  // /wo/[token] is the unauthenticated crew-facing work order link - the
  // token itself is the access control, not a session (see
  // src/app/wo/[token]/page.tsx).
  const isPublicWorkOrder = req.nextUrl.pathname.startsWith("/wo/");

  if (!isLoggedIn && !isLoginPage && !isPublicWorkOrder) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/properties", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
