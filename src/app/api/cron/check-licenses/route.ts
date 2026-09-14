import { NextRequest, NextResponse } from "next/server";
import { checkExpiringLicenses } from "@/lib/licenses";

// Called daily by Vercel Cron (see vercel.json). Vercel signs its own cron
// requests with this same secret as a bearer token, so this also rejects
// anyone else hitting the endpoint directly. If CRON_SECRET isn't set
// (e.g. running locally), the check just runs unauthenticated.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await checkExpiringLicenses();
  return NextResponse.json(result);
}
