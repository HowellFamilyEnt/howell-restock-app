import { prisma } from "@/lib/prisma";
import { sendEmail, sendSms } from "@/lib/notify";
import { getGuestAutomationEnabled } from "@/lib/settings";
import type { HostawayReservation } from "@/lib/hostaway";
import type { Property } from "@prisma/client";

function formatHour(hour: number | null | undefined): string | null {
  if (hour === null || hour === undefined) return null;
  const period = hour >= 12 ? "PM" : "AM";
  const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelveHour}:00 ${period}`;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function buildMessage(reservation: HostawayReservation, property: Property): string {
  const guestFirstName = reservation.guestFirstName || reservation.guestName?.split(" ")[0] || "there";
  const checkIn = formatHour(reservation.checkInTime);
  const checkOut = formatHour(reservation.checkOutTime);

  const lines = [
    `Hi ${guestFirstName}, you're confirmed at ${property.name_address}!`,
    property.address ? `Address: ${property.address}` : null,
    `Check-in: ${formatDate(reservation.arrivalDate)}${checkIn ? ` after ${checkIn}` : ""}`,
    `Check-out: ${formatDate(reservation.departureDate)}${checkOut ? ` by ${checkOut}` : ""}`,
    property.master_door_code ? `Door code: ${property.master_door_code}` : null,
    property.general_notes || null,
  ].filter((line): line is string => Boolean(line));

  return lines.join("\n");
}

// Triggered by the Hostaway "reservation created" webhook
// (src/app/api/webhooks/hostaway/route.ts). Sends directly by email/SMS -
// never through Hostaway's own guest-message thread - so VRBO's in-thread
// link blocking never applies. Idempotent per hostaway_reservation_id:
// safe to call again on a webhook retry, and only re-attempts whichever
// channel(s) didn't already succeed.
export async function sendBookingConfirmation(reservation: HostawayReservation): Promise<void> {
  const hostawayReservationId = String(reservation.id);
  const existing = await prisma.bookingConfirmation.findUnique({
    where: { hostaway_reservation_id: hostawayReservationId },
  });

  if (existing?.email_sent && existing?.sms_sent) return;

  const property = await prisma.property.findUnique({
    where: { hostaway_listing_id: String(reservation.listingMapId) },
  });

  const guestName = reservation.guestName ?? null;
  const arrivalDate = reservation.arrivalDate ? new Date(`${reservation.arrivalDate}T00:00:00Z`) : null;

  // A Hostaway listing this app doesn't manage a Property for (e.g. one of
  // the "in Hostaway but we don't manage it anymore" listings from the
  // Properties archive feature) - nothing to send, nothing to retry.
  if (!property) {
    await prisma.bookingConfirmation.upsert({
      where: { hostaway_reservation_id: hostawayReservationId },
      update: {},
      create: {
        hostaway_reservation_id: hostawayReservationId,
        guest_name: guestName,
        arrival_date: arrivalDate,
        errors: "No matching property for this Hostaway listing.",
      },
    });
    return;
  }

  // Kill switch, checked here (not earlier) so the "no matching property"
  // case above still resolves the same way regardless - the switch only
  // ever prevents a real send, never a diagnostic log entry. Global first
  // since it's the one meant to be flipped off fast during testing.
  const globalEnabled = await getGuestAutomationEnabled();
  if (!globalEnabled || !property.guest_automation_enabled) {
    await prisma.bookingConfirmation.upsert({
      where: { hostaway_reservation_id: hostawayReservationId },
      update: { property_id: property.id, guest_name: guestName, arrival_date: arrivalDate },
      create: {
        hostaway_reservation_id: hostawayReservationId,
        property_id: property.id,
        guest_name: guestName,
        arrival_date: arrivalDate,
        errors: !globalEnabled
          ? "Guest automation is disabled in Settings - nothing sent."
          : "Guest automation is disabled for this property - nothing sent.",
      },
    });
    return;
  }

  const guestEmail = reservation.guestEmail || reservation.hostProxyEmail || null;
  const guestPhone = reservation.phone || null;
  const message = buildMessage(reservation, property);
  const subject = `You're confirmed at ${property.name_address}`;

  let emailSent = existing?.email_sent ?? false;
  let smsSent = existing?.sms_sent ?? false;
  const errors: string[] = [];

  if (!emailSent) {
    if (guestEmail) {
      const error = await sendEmail(guestEmail, subject, message);
      if (error) errors.push(`Email: ${error}`);
      else emailSent = true;
    } else {
      errors.push("Email: no guest email or host-proxy email available.");
    }
  }

  if (!smsSent) {
    if (guestPhone) {
      const error = await sendSms(guestPhone, message);
      if (error) errors.push(`SMS: ${error}`);
      else smsSent = true;
    } else {
      errors.push("SMS: no guest phone available.");
    }
  }

  const data = {
    property_id: property.id,
    guest_name: guestName,
    guest_email: guestEmail,
    guest_phone: guestPhone,
    arrival_date: arrivalDate,
    email_sent: emailSent,
    sms_sent: smsSent,
    errors: errors.length > 0 ? errors.join("; ") : null,
  };

  await prisma.bookingConfirmation.upsert({
    where: { hostaway_reservation_id: hostawayReservationId },
    update: data,
    create: { hostaway_reservation_id: hostawayReservationId, ...data },
  });
}
