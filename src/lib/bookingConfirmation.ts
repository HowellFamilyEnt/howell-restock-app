import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail, sendSms } from "@/lib/notify";
import { getGuestAutomationEnabled } from "@/lib/settings";
import { formatHour, formatReservationDate } from "@/lib/calendar";
import { baseUrl } from "@/lib/workorders";
import type { HostawayReservation } from "@/lib/hostaway";
import type { Property } from "@prisma/client";

function buildMessage(reservation: HostawayReservation, property: Property, shareToken: string): string {
  const guestFirstName = reservation.guestFirstName || reservation.guestName?.split(" ")[0] || "there";
  const checkIn = formatHour(reservation.checkInTime);
  const checkOut = formatHour(reservation.checkOutTime);

  const lines = [
    `Hi ${guestFirstName}, you're confirmed at ${property.name_address}!`,
    property.address ? `Address: ${property.address}` : null,
    `Check-in: ${formatReservationDate(reservation.arrivalDate)}${checkIn ? ` after ${checkIn}` : ""}`,
    `Check-out: ${formatReservationDate(reservation.departureDate)}${checkOut ? ` by ${checkOut}` : ""}`,
    property.master_door_code ? `Door code: ${property.master_door_code}` : null,
    // Deliberately no property.general_notes here - that field is
    // internal-only ("crew or office," see the schema comment on
    // Property.general_notes). Guest-facing details live in the portal.
    `View full check-in details: ${baseUrl()}/guest/${shareToken}`,
  ].filter((line): line is string => Boolean(line));

  return lines.join("\n");
}

// Triggered by the Hostaway "reservation created" webhook
// (src/app/api/webhooks/hostaway/route.ts). Sends directly by email/SMS -
// never through Hostaway's own guest-message thread - so VRBO's in-thread
// link blocking never applies. Idempotent per hostaway_reservation_id:
// safe to call again on a webhook retry, and only re-attempts whichever
// channel(s) didn't already succeed. Every reservation gets a stable
// share_token (reused across retries, not regenerated) the first time its
// row is created, regardless of whether a send actually goes out - that
// token is what /guest/[token] looks up.
export async function sendBookingConfirmation(reservation: HostawayReservation): Promise<void> {
  const hostawayReservationId = String(reservation.id);
  const existing = await prisma.bookingConfirmation.findUnique({
    where: { hostaway_reservation_id: hostawayReservationId },
  });

  if (existing?.email_sent && existing?.sms_sent) return;

  const property = await prisma.property.findUnique({
    where: { hostaway_listing_id: String(reservation.listingMapId) },
  });

  const shareToken = existing?.share_token ?? crypto.randomBytes(24).toString("hex");
  const guestName = reservation.guestName ?? null;
  const arrivalDate = reservation.arrivalDate ? new Date(`${reservation.arrivalDate}T00:00:00Z`) : null;
  const departureDate = reservation.departureDate ? new Date(`${reservation.departureDate}T00:00:00Z`) : null;

  // A Hostaway listing this app doesn't manage a Property for (e.g. one of
  // the "in Hostaway but we don't manage it anymore" listings from the
  // Properties archive feature) - nothing to send, nothing to retry.
  if (!property) {
    await prisma.bookingConfirmation.upsert({
      where: { hostaway_reservation_id: hostawayReservationId },
      update: { share_token: shareToken },
      create: {
        hostaway_reservation_id: hostawayReservationId,
        share_token: shareToken,
        guest_name: guestName,
        arrival_date: arrivalDate,
        departure_date: departureDate,
        check_in_hour: reservation.checkInTime ?? null,
        check_out_hour: reservation.checkOutTime ?? null,
        confirmation_code: reservation.confirmationCode ?? null,
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
      update: {
        property_id: property.id,
        guest_name: guestName,
        arrival_date: arrivalDate,
        departure_date: departureDate,
        share_token: shareToken,
      },
      create: {
        hostaway_reservation_id: hostawayReservationId,
        share_token: shareToken,
        property_id: property.id,
        guest_name: guestName,
        arrival_date: arrivalDate,
        departure_date: departureDate,
        check_in_hour: reservation.checkInTime ?? null,
        check_out_hour: reservation.checkOutTime ?? null,
        confirmation_code: reservation.confirmationCode ?? null,
        errors: !globalEnabled
          ? "Guest automation is disabled in Settings - nothing sent."
          : "Guest automation is disabled for this property - nothing sent.",
      },
    });
    return;
  }

  const guestEmail = reservation.guestEmail || reservation.hostProxyEmail || null;
  const guestPhone = reservation.phone || null;
  const message = buildMessage(reservation, property, shareToken);
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
    share_token: shareToken,
    property_id: property.id,
    guest_name: guestName,
    guest_email: guestEmail,
    guest_phone: guestPhone,
    arrival_date: arrivalDate,
    departure_date: departureDate,
    check_in_hour: reservation.checkInTime ?? null,
    check_out_hour: reservation.checkOutTime ?? null,
    confirmation_code: reservation.confirmationCode ?? null,
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
