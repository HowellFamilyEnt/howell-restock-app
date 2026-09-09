import { prisma } from "@/lib/prisma";
import { ACCESS_SECTIONS, ACCESS_COOKIE_NAME } from "@/lib/accessLinks";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const origin = new URL(request.url).origin;

  const link = await prisma.accessLink.findUnique({ where: { token } });

  if (!link || !link.active || link.sections.length === 0) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const firstSection = ACCESS_SECTIONS.find((s) => link.sections.includes(s.key));
  const destination = firstSection?.path ?? "/login";

  const response = NextResponse.redirect(new URL(destination, origin));
  response.cookies.set(ACCESS_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180, // 180 days
  });

  return response;
}
