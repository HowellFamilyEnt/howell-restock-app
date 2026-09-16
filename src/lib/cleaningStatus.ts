"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { fetchReservationsNear, occupiedListingIdsOn } from "@/lib/scheduling";

export type CleaningStatus = "not_ready" | "ready" | "occupied";

// "Occupied" is a display override, never written to Property.cleaning_status
// - the stored value is left alone and takes over again the moment the stay
// ends, so the crew (or anyone) setting a status ahead of a departure isn't
// blocked or silently overwritten by this.
export async function activeCleaningStatuses(): Promise<Map<string, CleaningStatus>> {
  const properties = await prisma.property.findMany({
    where: { active: true },
    select: { id: true, source: true, hostaway_listing_id: true, cleaning_status: true },
  });

  const reservations = await fetchReservationsNear(new Date());
  const occupiedListingIds = occupiedListingIdsOn(new Date(), reservations);

  const result = new Map<string, CleaningStatus>();
  for (const property of properties) {
    const occupied =
      property.source === "Hostaway" &&
      !!property.hostaway_listing_id &&
      occupiedListingIds.has(property.hostaway_listing_id);
    result.set(property.id, occupied ? "occupied" : (property.cleaning_status as CleaningStatus));
  }
  return result;
}

export async function setCleaningStatus(propertyId: string, status: "not_ready" | "ready"): Promise<void> {
  await prisma.property.update({ where: { id: propertyId }, data: { cleaning_status: status } });
  revalidatePath("/cleaning/[token]", "page");
}
