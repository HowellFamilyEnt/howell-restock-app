"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { PropertyType } from "@prisma/client";
import { syncHostawayListings } from "@/lib/hostaway";

export async function createProperty(formData: FormData) {
  const name_address = String(formData.get("name_address") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const type = String(formData.get("type") ?? "") as PropertyType;
  const unit_count = Number(formData.get("unit_count"));
  const assigned_cleaning_team = String(formData.get("assigned_cleaning_team") ?? "").trim();
  const restock_frequency_days = Number(formData.get("restock_frequency_days"));
  const bedroomsRaw = String(formData.get("bedrooms") ?? "").trim();
  const bathroomsRaw = String(formData.get("bathrooms") ?? "").trim();
  const bedrooms = bedroomsRaw ? Number(bedroomsRaw) : null;
  const bathrooms = bathroomsRaw ? Number(bathroomsRaw) : null;

  if (!name_address || !type || !Number.isFinite(unit_count) || !Number.isFinite(restock_frequency_days)) {
    throw new Error("Missing or invalid property fields.");
  }
  if (bedrooms !== null && !Number.isFinite(bedrooms)) {
    throw new Error("Invalid bedrooms value.");
  }
  if (bathrooms !== null && !Number.isFinite(bathrooms)) {
    throw new Error("Invalid bathrooms value.");
  }

  await prisma.property.create({
    data: {
      name_address,
      address: address || null,
      bedrooms,
      bathrooms,
      type,
      unit_count,
      assigned_cleaning_team: assigned_cleaning_team || null,
      restock_frequency_days,
      source: "Manual",
    },
  });

  revalidatePath("/properties");
}

export async function toggleUrgent(propertyId: string, next: boolean) {
  await prisma.property.update({
    where: { id: propertyId },
    data: { urgent_restock_requested: next },
  });
  revalidatePath("/properties");
}

export async function updateArea(propertyId: string, formData: FormData) {
  const area = String(formData.get("area") ?? "").trim();
  await prisma.property.update({
    where: { id: propertyId },
    data: { area: area || null },
  });
  revalidatePath("/properties");
}

export async function togglePropertyActive(propertyId: string, next: boolean) {
  await prisma.property.update({
    where: { id: propertyId },
    data: { active: next },
  });
  revalidatePath("/properties");
}

// Mass on/off for the per-property guest-automation switch - the
// Properties page only ever shows the UI to call this when the master
// switch (IntegrationSettings.guest_automation_enabled) is already on,
// but this doesn't re-check that itself: the master switch is checked at
// send-time everywhere guest-facing (sendBookingConfirmation,
// provisionGuestAccessCode), so a stale/bypassed call here can never
// actually reach a guest on its own.
export async function bulkSetGuestAutomation(propertyIds: string[], enabled: boolean) {
  if (propertyIds.length === 0) return;
  await prisma.property.updateMany({
    where: { id: { in: propertyIds } },
    data: { guest_automation_enabled: enabled },
  });
  revalidatePath("/properties");
  revalidatePath("/properties/[id]", "page");
}

export async function runHostawaySync(
  _prevState: string | undefined,
  _formData: FormData
): Promise<string> {
  try {
    const result = await syncHostawayListings();
    revalidatePath("/properties");
    return `Synced: ${result.created} new, ${result.updated} updated (${result.totalListings} listings pulled).`;
  } catch (error) {
    return error instanceof Error ? `Sync failed: ${error.message}` : "Sync failed.";
  }
}
