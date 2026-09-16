import { NextRequest, NextResponse } from "next/server";
import { getHostawayCredentials, getHostawayWebhookCredentials } from "@/lib/settings";
import { getAccessToken, fetchReservationById } from "@/lib/hostaway";
import { sendBookingConfirmation } from "@/lib/bookingConfirmation";
import { provisionGuestAccessCode } from "@/lib/guestAccess";

function isAuthorized(request: NextRequest, username: string, password: string): boolean {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) return false;
  const decoded = Buffer.from(auth.slice(6), "base64").toString("utf-8");
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) return false;
  return decoded.slice(0, separatorIndex) === username && decoded.slice(separatorIndex + 1) === password;
}

type WebhookBody = {
  id?: unknown;
  event?: unknown;
  type?: unknown;
  action?: unknown;
  reservationId?: unknown;
  data?: { id?: unknown; reservationId?: unknown };
  object?: { id?: unknown };
};

// Reservation id can show up under a few plausible shapes depending on
// Hostaway's actual webhook payload - not fully documented publicly at
// build time (see the "known unknown" in the P1 plan). Tried in order,
// first valid match wins.
function extractReservationId(body: WebhookBody): number | null {
  const candidates = [body.id, body.reservationId, body.data?.id, body.data?.reservationId, body.object?.id];
  for (const candidate of candidates) {
    const id = Number(candidate);
    if (Number.isFinite(id) && id > 0) return id;
  }
  return null;
}

function extractEventType(body: WebhookBody): string | null {
  const value = body.event ?? body.type ?? body.action;
  return typeof value === "string" ? value : null;
}

// Receives Hostaway's "reservation created" webhook and sends the guest a
// direct email + text (src/lib/bookingConfirmation.ts) - outside Hostaway's
// own guest-message thread entirely, so VRBO's link blocking there never
// applies. Registered manually in Hostaway's dashboard (Settings ->
// Integrations) against this URL; see the Settings page for the
// username/password to set there.
export async function POST(request: NextRequest) {
  const webhookCredentials = await getHostawayWebhookCredentials();
  if (!webhookCredentials) {
    // Fails closed, unlike most credentials in this app - this endpoint is
    // reachable from the public internet and handles real guest contact
    // data, so it shouldn't ever run unauthenticated by accident.
    return NextResponse.json({ error: "Webhook not configured" }, { status: 401 });
  }
  if (!isAuthorized(request, webhookCredentials.username, webhookCredentials.password)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as WebhookBody | null;
  if (!body) {
    return NextResponse.json({ ok: true, skipped: "invalid JSON body" });
  }

  // Only a reservation-created event triggers a guest send - a
  // reservation-updated event (if Hostaway ever sends one here) would
  // otherwise re-send on every routine channel sync. Always ack with 200
  // either way, since Hostaway retries non-2xx responses 3x.
  const eventType = extractEventType(body);
  if (eventType && !eventType.toLowerCase().includes("created")) {
    return NextResponse.json({ ok: true, skipped: "not a reservation-created event" });
  }

  const reservationId = extractReservationId(body);
  if (!reservationId) {
    console.error("Hostaway webhook: no reservation id found in body", JSON.stringify(body));
    return NextResponse.json({ ok: true, skipped: "no reservation id found" });
  }

  try {
    const credentials = await getHostawayCredentials();
    if (!credentials) {
      console.error("Hostaway webhook: no Hostaway API credentials configured");
      return NextResponse.json({ ok: true, skipped: "Hostaway API credentials not configured" });
    }
    const token = await getAccessToken(credentials.accountId, credentials.apiKey);
    const reservation = await fetchReservationById(token, reservationId);

    // Independently try/caught - a Seam failure should never block the
    // guest's email/text, and vice versa.
    try {
      await sendBookingConfirmation(reservation);
    } catch (error) {
      console.error("Hostaway webhook: failed to send booking confirmation", error);
    }
    try {
      await provisionGuestAccessCode(reservation);
    } catch (error) {
      console.error("Hostaway webhook: failed to provision guest access code", error);
    }
  } catch (error) {
    console.error("Hostaway webhook: failed to fetch reservation", error);
  }

  return NextResponse.json({ ok: true });
}
