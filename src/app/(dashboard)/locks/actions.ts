"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { syncSeamLocks } from "@/lib/seamSync";
import { provisionTeamCodesForProperty } from "@/lib/teamAccessCodes";

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
    await provisionTeamCodesForProperty(propertyId);
  }

  revalidatePath("/locks");
  revalidatePath("/locks/[deviceId]", "page");
  revalidatePath("/properties/[id]", "page");
}

export async function resyncSeamLocks(): Promise<string> {
  try {
    const result = await syncSeamLocks();
    revalidatePath("/locks");
    revalidatePath("/locks/[deviceId]", "page");
    const missingNote = result.missing > 0 ? ` (${result.missing} missing from Seam)` : "";
    return `Synced ${result.synced} device${result.synced === 1 ? "" : "s"} from Seam${missingNote}.`;
  } catch (error) {
    return error instanceof Error ? error.message : "Sync failed.";
  }
}

// Archive (hide-by-default, reversible) - same pattern as
// togglePropertyActive. Assignment isn't touched either way; an archived
// lock still shows on its assigned property's page until reassigned.
export async function toggleSeamLockActive(deviceId: string, next: boolean) {
  await prisma.seamLock.update({ where: { device_id: deviceId }, data: { active: next } });
  revalidatePath("/locks");
}

// Guarded permanent delete, same shape as deleteProperty/deleteItem: only
// blocks on a real dependency (a property currently assigned to this
// lock) rather than any history, since a lock itself has none locally -
// GuestAccessCode rows reference the property and Seam's own
// access_code_id, not this row, so deleting it doesn't orphan anything
// except a dangling assignment, which this guard prevents outright.
export async function deleteSeamLock(
  id: string,
  _prevState: string | undefined,
  _formData: FormData
): Promise<string> {
  const lock = await prisma.seamLock.findUnique({ where: { id } });
  if (!lock) return "Not found.";

  const assignedProperty = await prisma.property.findFirst({ where: { smart_lock_id: lock.device_id } });
  if (assignedProperty) {
    return `Assigned to ${assignedProperty.name_address} — unassign it first.`;
  }

  await prisma.seamLock.delete({ where: { id } });
  revalidatePath("/locks");
  return "";
}
