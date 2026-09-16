"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { syncSeamLocks } from "@/lib/seamSync";

// Keeps the assignment 1:1: clears any other property currently pointing
// at this device before assigning it to the new one (or to nothing, if
// propertyId is blank). Property.smart_lock_id stays the source of truth -
// this page is a friendlier way to set it than hand-picking a device_id.
export async function assignLock(deviceId: string, formData: FormData) {
  const propertyId = String(formData.get("property_id") ?? "").trim();

  await prisma.property.updateMany({
    where: { smart_lock_id: deviceId },
    data: { smart_lock_id: null },
  });

  if (propertyId) {
    await prisma.property.update({ where: { id: propertyId }, data: { smart_lock_id: deviceId } });
  }

  revalidatePath("/locks");
  revalidatePath("/properties/[id]", "page");
}

export async function resyncSeamLocks(): Promise<string> {
  try {
    const result = await syncSeamLocks();
    revalidatePath("/locks");
    return `Synced ${result.synced} device${result.synced === 1 ? "" : "s"} from Seam.`;
  } catch (error) {
    return error instanceof Error ? error.message : "Sync failed.";
  }
}
