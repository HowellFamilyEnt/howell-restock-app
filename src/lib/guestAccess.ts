import { prisma } from "@/lib/prisma";
import { getGuestAutomationEnabled, getSeamApiKey } from "@/lib/settings";
import { createSeamAccessCode } from "@/lib/seam";
import { zonedTimeToUtc } from "@/lib/calendar";
import type { HostawayReservation } from "@/lib/hostaway";

const DEFAULT_WINDOW_START_OFFSET_MS = 60 * 60 * 1000; // opens 1 hour before check-in

// Triggered alongside sendBookingConfirmation from the same Hostaway
// "reservation created" webhook - independently try/caught there so a
// Seam failure never blocks the guest's email/text or vice versa.
// Idempotent per hostaway_reservation_id, same shape as
// sendBookingConfirmation. No-op for the ~all properties not yet piloted
// on smart access (no smart_lock_id) - this rolls out property by
// property, not all at once.
export async function provisionGuestAccessCode(reservation: HostawayReservation): Promise<void> {
  const hostawayReservationId = String(reservation.id);
  const existing = await prisma.guestAccessCode.findUnique({
    where: { hostaway_reservation_id: hostawayReservationId },
  });
  if (existing?.seam_access_code_id) return;

  const property = await prisma.property.findUnique({
    where: { hostaway_listing_id: String(reservation.listingMapId) },
  });
  if (!property || !property.smart_lock_id) return; // no matching property, or not piloted here

  const recordSkip = (error: string) =>
    prisma.guestAccessCode.upsert({
      where: { hostaway_reservation_id: hostawayReservationId },
      update: { property_id: property.id, purpose: "guest", label: reservation.guestName ?? null, error },
      create: {
        hostaway_reservation_id: hostawayReservationId,
        property_id: property.id,
        purpose: "guest",
        label: reservation.guestName ?? null,
        error,
      },
    });

  const globalEnabled = await getGuestAutomationEnabled();
  if (!globalEnabled || !property.guest_automation_enabled) {
    await recordSkip(
      !globalEnabled
        ? "Guest automation is disabled in Settings - no code issued."
        : "Guest automation is disabled for this property - no code issued."
    );
    return;
  }

  if (!property.timezone) {
    await recordSkip(
      "Property has no timezone on file yet (populated by the next Hostaway sync) - can't safely compute a code window."
    );
    return;
  }

  const apiKey = await getSeamApiKey();
  if (!apiKey) {
    await recordSkip("No Seam API key configured.");
    return;
  }

  const checkInHour = reservation.checkInTime ?? 16;
  const checkOutHour = reservation.checkOutTime ?? 10;
  const checkInInstant = zonedTimeToUtc(reservation.arrivalDate, checkInHour, property.timezone);
  const startsAt = new Date(checkInInstant.getTime() - DEFAULT_WINDOW_START_OFFSET_MS);
  const endsAt = zonedTimeToUtc(reservation.departureDate, checkOutHour, property.timezone);

  const data = {
    property_id: property.id,
    purpose: "guest",
    label: reservation.guestName ?? null,
    starts_at: startsAt,
    ends_at: endsAt,
  };

  try {
    const accessCode = await createSeamAccessCode(apiKey, {
      deviceId: property.smart_lock_id,
      name: `${reservation.guestName ?? "Guest"} - ${reservation.confirmationCode ?? hostawayReservationId}`,
      startsAt,
      endsAt,
      useBackupPool: true,
    });

    await prisma.guestAccessCode.upsert({
      where: { hostaway_reservation_id: hostawayReservationId },
      update: {
        ...data,
        seam_access_code_id: accessCode.access_code_id,
        code: accessCode.code,
        status: accessCode.display_status ?? accessCode.status,
        error: null,
      },
      create: {
        hostaway_reservation_id: hostawayReservationId,
        ...data,
        seam_access_code_id: accessCode.access_code_id,
        code: accessCode.code,
        status: accessCode.display_status ?? accessCode.status,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Seam request failed.";
    await prisma.guestAccessCode.upsert({
      where: { hostaway_reservation_id: hostawayReservationId },
      update: { ...data, error: message },
      create: { hostaway_reservation_id: hostawayReservationId, ...data, error: message },
    });
  }
}
