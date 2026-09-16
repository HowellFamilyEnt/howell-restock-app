import { prisma } from "@/lib/prisma";
import { getSeamApiKey } from "@/lib/settings";
import { listSeamLocks, listSeamConnectedAccounts } from "@/lib/seam";

// Pulls the live device list from Seam and upserts it into the local
// SeamLock cache (manufacturer, online/wifi status, battery) - triggered
// by the "Resync" button on /locks. Never deletes a row for a device that
// didn't come back in this fetch (a flaky Seam response shouldn't silently
// drop a property's lock assignment) - it only ever adds/updates.
export async function syncSeamLocks(): Promise<{ synced: number }> {
  const apiKey = await getSeamApiKey();
  if (!apiKey) throw new Error("No Seam API key configured.");

  const [devices, connectedAccounts] = await Promise.all([
    listSeamLocks(apiKey),
    listSeamConnectedAccounts(apiKey),
  ]);

  const manufacturerByAccountId = new Map(
    connectedAccounts.map((a) => [a.connected_account_id, a.account_type_display_name])
  );

  for (const device of devices) {
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

  return { synced: devices.length };
}
