import { NextRequest, NextResponse } from "next/server";
import { checkLockHealthAndAlert } from "@/lib/lockHealth";

// Called every 15 min by Vercel Cron (see vercel.json) - same auth
// pattern as check-licenses.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await checkLockHealthAndAlert();
  return NextResponse.json(result);
}
