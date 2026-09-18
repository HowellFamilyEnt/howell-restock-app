import { prisma } from "@/lib/prisma";
import { getSeamApiKey } from "@/lib/settings";
import { getSeamAccessCode, deleteSeamAccessCode, createSeamAccessCode } from "@/lib/seam";

// Run by the check-lock-health cron alongside the online/battery checks -
// a code's status at creation time is always optimistic (Seam hasn't
// actually tried setting it on the device yet), so without this pass a
// code that later fails asynchronously (discovered live: a duplicate-PIN
// collision on an Igloohome lock) would sit looking "Issuing" forever
// and nobody would know a guest/vendor/team member never actually got
// working access.
const MAX_RETRIES = 3;
const CHECK_WINDOW_HOURS = 6; // no point re-checking codes from days ago forever

function isRetryableErrorCode(errorCode: string | undefined): boolean {
  // The one failure mode confirmed live so far - a random code Seam
  // generated happened to already exist on that specific device.
  // Retrying with a different value resolves it; anything else gets
  // recorded rather than blindly retried.
  return errorCode === "duplicate_code_on_device";
}

// Guest, vendor, and one-time codes all live in GuestAccessCode and all
// use a Seam-generated random code, so a collision retry is simple: ask
// Seam for a new one.
export async function repairGuestAccessCodes(): Promise<{ checked: number; repaired: number; failed: number }> {
  const apiKey = await getSeamApiKey();
  if (!apiKey) return { checked: 0, repaired: 0, failed: 0 };

  const cutoff = new Date(Date.now() - CHECK_WINDOW_HOURS * 60 * 60 * 1000);
  const rows = await prisma.guestAccessCode.findMany({
    where: { seam_access_code_id: { not: null }, confirmed_active: false, createdAt: { gte: cutoff } },
    include: { property: true },
  });

  let repaired = 0;
  let failed = 0;

  for (const row of rows) {
    if (!row.seam_access_code_id) continue;
    const live = await getSeamAccessCode(apiKey, row.seam_access_code_id).catch(() => null);
    if (!live) continue;

    if (live.status === "set" && (!live.errors || live.errors.length === 0)) {
      await prisma.guestAccessCode.update({
        where: { id: row.id },
        data: {
          confirmed_active: true,
          status: live.display_status ?? live.status,
          error: null,
          // Offline (e.g. one-time-use) codes don't get their PIN back
          // synchronously at creation - backfill it here if the issuing
          // request's own short poll hadn't caught it yet.
          ...(live.code && !row.code ? { code: live.code } : {}),
        },
      });
      continue;
    }

    const latestError = live.errors?.[live.errors.length - 1];
    if (!latestError) continue; // genuinely still pending - check again next run

    if (isRetryableErrorCode(latestError.error_code) && row.retry_count < MAX_RETRIES && row.property.smart_lock_id) {
      await deleteSeamAccessCode(apiKey, row.seam_access_code_id).catch(() => {});
      try {
        const fresh = await createSeamAccessCode(apiKey, {
          deviceId: row.property.smart_lock_id,
          name: `${row.label ?? "Guest"} - ${row.hostaway_reservation_id ?? row.id}`,
          startsAt: row.starts_at ?? undefined,
          endsAt: row.ends_at ?? undefined,
        });
        await prisma.guestAccessCode.update({
          where: { id: row.id },
          data: {
            seam_access_code_id: fresh.access_code_id,
            code: fresh.code,
            status: fresh.display_status ?? fresh.status,
            error: null,
            retry_count: { increment: 1 },
          },
        });
        repaired++;
      } catch (error) {
        await prisma.guestAccessCode.update({
          where: { id: row.id },
          data: {
            error: error instanceof Error ? error.message : "Retry failed.",
            retry_count: { increment: 1 },
          },
        });
        failed++;
      }
    } else {
      await prisma.guestAccessCode.update({
        where: { id: row.id },
        data: { error: `${latestError.message} (${latestError.error_code ?? "unknown"})` },
      });
      failed++;
    }
  }

  return { checked: rows.length, repaired, failed };
}

// Team codes use a deterministic PIN (last 4 of the member's phone), so
// a collision can't just be retried with the same value - it would
// collide again identically. On a confirmed collision this falls back
// to a Seam-generated random code for that one property only (every
// other property still gets the member's normal last-4 code), and
// records that deviation in `error` so it's visible rather than silent.
export async function repairTeamAccessCodes(): Promise<{ checked: number; repaired: number; failed: number }> {
  const apiKey = await getSeamApiKey();
  if (!apiKey) return { checked: 0, repaired: 0, failed: 0 };

  const cutoff = new Date(Date.now() - CHECK_WINDOW_HOURS * 60 * 60 * 1000);
  const rows = await prisma.teamAccessCode.findMany({
    where: { seam_access_code_id: { not: null }, confirmed_active: false, createdAt: { gte: cutoff } },
    include: { property: true, teamMember: true },
  });

  let repaired = 0;
  let failed = 0;

  for (const row of rows) {
    if (!row.seam_access_code_id) continue;
    const live = await getSeamAccessCode(apiKey, row.seam_access_code_id).catch(() => null);
    if (!live) continue;

    if (live.status === "set" && (!live.errors || live.errors.length === 0)) {
      await prisma.teamAccessCode.update({
        where: { id: row.id },
        data: { confirmed_active: true, status: live.display_status ?? live.status, error: null },
      });
      continue;
    }

    const latestError = live.errors?.[live.errors.length - 1];
    if (!latestError) continue;

    if (isRetryableErrorCode(latestError.error_code) && row.retry_count < MAX_RETRIES && row.property.smart_lock_id) {
      await deleteSeamAccessCode(apiKey, row.seam_access_code_id).catch(() => {});
      try {
        // No `code` passed here on purpose - let Seam pick a random one
        // instead of retrying the same colliding last-4-of-phone value.
        const fresh = await createSeamAccessCode(apiKey, {
          deviceId: row.property.smart_lock_id,
          name: `HFE-Team-${row.teamMember.name}`,
        });
        await prisma.teamAccessCode.update({
          where: { id: row.id },
          data: {
            seam_access_code_id: fresh.access_code_id,
            code: fresh.code,
            status: fresh.display_status ?? fresh.status,
            error: "This property's code differs from the usual last-4-of-phone value due to a device collision.",
            retry_count: { increment: 1 },
          },
        });
        repaired++;
      } catch (error) {
        await prisma.teamAccessCode.update({
          where: { id: row.id },
          data: {
            error: error instanceof Error ? error.message : "Retry failed.",
            retry_count: { increment: 1 },
          },
        });
        failed++;
      }
    } else {
      await prisma.teamAccessCode.update({
        where: { id: row.id },
        data: { error: `${latestError.message} (${latestError.error_code ?? "unknown"})` },
      });
      failed++;
    }
  }

  return { checked: rows.length, repaired, failed };
}
