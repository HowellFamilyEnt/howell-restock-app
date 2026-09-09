import { ACCESS_COOKIE_NAME } from "@/lib/accessLinks";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const response = NextResponse.redirect(new URL("/login", origin));
  response.cookies.delete(ACCESS_COOKIE_NAME);
  return response;
}
