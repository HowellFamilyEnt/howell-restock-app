import { NextRequest, NextResponse } from "next/server";
import { checkLockHealthAndAlert } from "@/lib/lockHealth";
import { repairGuestAccessCodes, repairTeamAccessCodes } from "@/lib/accessCodeRepair";

// Called every 15 min by Vercel Cron (see vercel.json) - same auth
// pattern as check-licenses. Also repairs access codes that failed
// asynchronously after creation (a code's status is only ever
// optimistic right when it's made - see accessCodeRepair.ts), since
// that's the same "how's the lock infrastructure doing" concern as the
// online/battery checks.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const [health, guestCodes, teamCodes] = await Promise.all([
    checkLockHealthAndAlert(),
    repairGuestAccessCodes(),
    repairTeamAccessCodes(),
  ]);

  return NextResponse.json({ health, guestCodes, teamCodes });
}
