import { prisma } from "@/lib/prisma";
import { getSeamApiKey } from "@/lib/settings";
import { listSeamLocks, listSeamConnectedAccounts } from "@/lib/seam";

// Pulls the live device list from Seam and upserts it into the local
// SeamLock cache (manufacturer, online/wifi status, battery) - triggered
// by the "Resync" button on /locks. Never deletes a row for a device that
// didn't come back in this fetch (a flaky Seam response shouldn't silently
// drop a property's lock assignment); instead it's flagged via
// missing_since (see the field comment on SeamLock) so it's visible on
// the page rather than either vanishing or looking unchanged.
export async function syncSeamLocks(): Promise<{ synced: number; missing: number }> {
  const apiKey = await getSeamApiKey();
  if (!apiKey) throw new Error("No Seam API key configured.");

  const [devices, connectedAccounts] = await Promise.all([
    listSeamLocks(apiKey),
    listSeamConnectedAccounts(apiKey),
  ]);

  const manufacturerByAccountId = new Map(
    connectedAccounts.map((a) => [a.connected_account_id, a.account_type_display_name])
  );

  const seenDeviceIds: string[] = [];

  for (const device of devices) {
    seenDeviceIds.push(device.device_id);
    const manufacturer = device.connected_account_id
      ? (manufacturerByAccountId.get(device.connected_account_id) ?? null)
      : null;

    await prisma.seamLock.upsert({
      where: { device_id: device.device_id },
      update: {
        manufacturer,
        display_name: device.display_name,
        online: device.properties?.online ?? true,
        battery_level: device.properties?.battery?.level ?? null,
        battery_status: device.properties?.battery?.status ?? null,
        lastSyncedAt: new Date(),
        missing_since: null, // it's back, if it was previously flagged missing
      },
      create: {
        device_id: device.device_id,
        manufacturer,
        display_name: device.display_name,
        online: device.properties?.online ?? true,
        battery_level: device.properties?.battery?.level ?? null,
        battery_status: device.properties?.battery?.status ?? null,
      },
    });
  }

  // Flags any previously-known lock that didn't come back in this fetch -
  // only stamps missing_since the first time (the where clause excludes
  // rows that already have one), so the page can show how long it's been
  // gone rather than a timestamp that creeps forward on every resync.
  // Skipped entirely when Seam returns zero devices - a suspicious result
  // on its own (given 35 real locks exist) that's far more likely a
  // transient API hiccup than every lock vanishing at once, and flagging
  // all of them "missing" on that basis would be a false alarm.
  let missing = 0;
  if (devices.length > 0) {
    await prisma.seamLock.updateMany({
      where: { device_id: { notIn: seenDeviceIds }, missing_since: null },
      data: { missing_since: new Date() },
    });
    missing = await prisma.seamLock.count({ where: { missing_since: { not: null } } });
  }

  return { synced: devices.length, missing };
}
