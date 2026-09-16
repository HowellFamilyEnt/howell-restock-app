// Ports the merge semantics from integrations/hostaway_sync.py (unit-tested
// there against mocked listings, never against a live account — see
// docs/PROJECT_SPEC.md section 6). Existing Hostaway-sourced properties are
// matched by hostaway_listing_id and only name_address/unit_count/address/
// bedrooms/bathrooms are updated; everything else the user set (crew,
// cadence, urgent, active) is left alone. Manually-entered properties
// (source = Manual) are never touched because they're never matched by
// hostaway_listing_id.
//
// address/bedroomsNumber/bathroomsNumber field names confirmed against
// Hostaway's public API docs, not yet verified against a live account.

import { prisma } from "@/lib/prisma";
import { getHostawayCredentials } from "@/lib/settings";

const TOKEN_URL = "https://api.hostaway.com/v1/accessTokens";
const LISTINGS_URL = "https://api.hostaway.com/v1/listings";
const RESERVATIONS_URL = "https://api.hostaway.com/v1/reservations";

type HostawayListing = {
  id: number;
  name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipcode?: string | null;
  bedroomsNumber?: number | null;
  bathroomsNumber?: number | null;
  airbnbExportStatus?: string | null;
  // IANA name (e.g. "America/Chicago") - confirmed live 2026-09-16 present
  // on both the bulk and single-listing endpoints, zero extra cost.
  timeZoneName?: string | null;
};

type MappedListing = {
  hostawayId: string;
  name: string;
  unitCount: number;
  address: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  airbnbStatus: string | null;
  timezone: string | null;
};

export async function getAccessToken(accountId: string, apiKey: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-control": "no-cache",
    },
    body: new URLSearchParams({
      client_id: accountId,
      client_secret: apiKey,
      grant_type: "client_credentials",
      scope: "general",
    }),
  });

  if (!res.ok) {
    throw new Error(`Hostaway token request failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { access_token: string };

  // Hostaway requires waiting >=1s before a freshly issued token is used.
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return data.access_token;
}

async function fetchAllListings(token: string): Promise<HostawayListing[]> {
  const listings: HostawayListing[] = [];
  let afterId = 0;

  while (true) {
    const url = new URL(LISTINGS_URL);
    url.searchParams.set("limit", "100");
    url.searchParams.set("afterId", String(afterId));

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`Hostaway listings request failed: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as { result?: HostawayListing[] };
    const page = data.result ?? [];
    if (page.length === 0) break;

    listings.push(...page);
    afterId = page[page.length - 1].id;
    if (page.length < 100) break;
  }

  return listings;
}

export type HostawayReservation = {
  id: number;
  listingMapId: number;
  arrivalDate: string; // YYYY-MM-DD
  departureDate: string; // YYYY-MM-DD
  status?: string | null;
  // Only populated by fetchReservationById below - the arrival-window
  // fetch above doesn't need them and every extra field costs nothing to
  // leave optional. checkInTime/checkOutTime are plain integer hours (same
  // quirk as Hostaway listings' own check-in/out fields), confirmed live
  // 2026-09-16 against a real reservation. guestEmail is frequently null
  // for Airbnb bookings (Airbnb withholds it) - hostProxyEmail is Airbnb's
  // own relay address and the fallback callers should use.
  guestName?: string | null;
  guestFirstName?: string | null;
  phone?: string | null;
  guestEmail?: string | null;
  hostProxyEmail?: string | null;
  checkInTime?: number | null;
  checkOutTime?: number | null;
  confirmationCode?: string | null;
};

// Fetches one reservation by id with every field Hostaway returns (guest
// contact info, check-in/out times, etc.) - used by the booking-webhook
// handler (src/lib/bookingConfirmation.ts) rather than trusting whatever
// the webhook body itself contains, since Hostaway's webhook payload shape
// isn't documented in detail.
export async function fetchReservationById(token: string, id: number): Promise<HostawayReservation> {
  const res = await fetch(`${RESERVATIONS_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Hostaway reservation ${id} request failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { result?: HostawayReservation };
  if (!data.result) {
    throw new Error(`Hostaway reservation ${id} response had no result.`);
  }
  return data.result;
}

// Writes a new check-in/check-out time back to a reservation - used when
// an upgrade request (early check-in / late checkout) is approved. Plain
// integer local hours, same confirmed-live convention as the field when
// reading it (sampled 20 real reservations across different properties
// before relying on this - values cluster at 16/10, a normal local
// check-in, never what UTC-converted values would look like). This is
// the first place this app writes to a reservation rather than only
// reading one - not live-tested until a specific real reservation is
// designated to try it against.
export async function updateReservationTimes(
  token: string,
  reservationId: number,
  input: { checkInTime?: number; checkOutTime?: number }
): Promise<void> {
  const res = await fetch(`${RESERVATIONS_URL}/${reservationId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Hostaway reservation ${reservationId} update failed: ${res.status} ${text.slice(0, 200)}`);
  }
}

// Verified against a live account (2026-09-10): the `listingMapId` query
// param is silently ignored (does NOT filter server-side - the account has
// ~8,500 reservations across every listing, so fetching unfiltered is not
// viable), but `arrivalStartDate` / `arrivalEndDate` genuinely do filter.
// Callers pass a bounded window and filter to one listing client-side (see
// src/lib/scheduling.ts) since a single listing's reservations aren't
// otherwise fetchable directly.
export async function fetchReservationsByArrivalWindow(
  token: string,
  arrivalStartDate: string,
  arrivalEndDate: string
): Promise<HostawayReservation[]> {
  const reservations: HostawayReservation[] = [];
  let afterId = 0;

  while (true) {
    const url = new URL(RESERVATIONS_URL);
    url.searchParams.set("arrivalStartDate", arrivalStartDate);
    url.searchParams.set("arrivalEndDate", arrivalEndDate);
    url.searchParams.set("limit", "100");
    url.searchParams.set("afterId", String(afterId));

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`Hostaway reservations request failed: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as { result?: HostawayReservation[] };
    const page = data.result ?? [];
    if (page.length === 0) break;

    reservations.push(...page);
    afterId = page[page.length - 1].id;
    if (page.length < 100) break;
  }

  return reservations.filter((r) => r.status !== "cancelled" && r.status !== "declined");
}

function mapListing(listing: HostawayListing): MappedListing {
  const addressParts = [listing.address, listing.city, listing.state, listing.zipcode].filter(
    (part): part is string => Boolean(part)
  );
  const address = addressParts.join(", ");

  return {
    hostawayId: String(listing.id),
    name: listing.name || address || `Hostaway Listing ${listing.id}`,
    unitCount: 1,
    address: address || null,
    bedrooms: typeof listing.bedroomsNumber === "number" ? listing.bedroomsNumber : null,
    bathrooms: typeof listing.bathroomsNumber === "number" ? listing.bathroomsNumber : null,
    airbnbStatus: listing.airbnbExportStatus ?? null,
    timezone: listing.timeZoneName ?? null,
  };
}

export type HostawayListingLicenseFields = {
  propertyLicenseNumber: string | null;
  propertyLicenseType: string | null;
  propertyLicenseIssueDate: string | null; // YYYY-MM-DD
  propertyLicenseExpirationDate: string | null;
};

// Confirmed live (2026-09-14) against a real listing: these four fields
// are already populated in this account and show up on the live Airbnb
// listing page under "Registration Details" once exported - see
// src/lib/licenses.ts for the push side that keeps them in sync with our
// own license_* fields on Property.
export async function fetchListingLicenseFields(
  token: string,
  hostawayListingId: string
): Promise<HostawayListingLicenseFields> {
  const res = await fetch(`${LISTINGS_URL}/${hostawayListingId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Hostaway listing fetch failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { result: Record<string, unknown> };
  const listing = data.result;
  return {
    propertyLicenseNumber: (listing.propertyLicenseNumber as string | null) ?? null,
    propertyLicenseType: (listing.propertyLicenseType as string | null) ?? null,
    propertyLicenseIssueDate: (listing.propertyLicenseIssueDate as string | null) ?? null,
    propertyLicenseExpirationDate: (listing.propertyLicenseExpirationDate as string | null) ?? null,
  };
}

// Confirmed via Hostaway's public API docs: PUT /v1/listings/{id} accepts
// a partial object - only the fields being changed need to be passed.
// Whether this alone re-exports to Airbnb (vs. needing the dashboard's
// separate "Save & Export" / "Export Listing" action) isn't documented -
// see the caveat surfaced on the Licenses page's sync button.
export async function updateListingLicenseFields(
  token: string,
  hostawayListingId: string,
  fields: Partial<HostawayListingLicenseFields>
): Promise<void> {
  const res = await fetch(`${LISTINGS_URL}/${hostawayListingId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Hostaway listing update failed: ${res.status} ${body.slice(0, 200)}`);
  }
}

// The exact 5 values Hostaway's API accepts for cancellationPolicy -
// anything else is rejected with a validation error (confirmed via
// api.hostaway.com/documentation).
export const CANCELLATION_POLICIES = ["flexible", "moderate", "firm", "strict", "no_refund"] as const;

export type HostawayAmenity = { id: number; name: string };

// GET /v1/amenities - undocumented in Hostaway's public API reference but
// confirmed working live (2026-09-15) and matches the amenityId taxonomy
// a real listing's own listingAmenities array uses (e.g. {"amenityId":2}
// = "Internet"). No filtering/pagination needed - the account's full
// amenity list is small enough to return in one call.
export async function fetchHostawayAmenities(token: string): Promise<HostawayAmenity[]> {
  const res = await fetch("https://api.hostaway.com/v1/amenities", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Hostaway amenities request failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { result?: HostawayAmenity[] };
  return data.result ?? [];
}

// Best-effort wrapper for pages that need the amenity checklist to render
// (Templates create/edit, New Listing) - returns an empty list rather
// than throwing if Hostaway isn't configured or unreachable, so those
// pages still load with an empty/explanatory checklist instead of a hard
// 500.
export async function getAmenitiesOrEmpty(): Promise<HostawayAmenity[]> {
  try {
    const credentials = await getHostawayCredentials();
    if (!credentials) return [];
    const token = await getAccessToken(credentials.accountId, credentials.apiKey);
    return await fetchHostawayAmenities(token);
  } catch {
    return [];
  }
}

export type CreateListingInput = {
  name: string;
  address: string;
  city?: string | null;
  state?: string | null;
  zipcode?: string | null;
  bedroomsNumber: number;
  bathroomsNumber: number;
  price: number;
  currencyCode: string;
  guestsIncluded: number;
  priceForExtraPerson: number;
  personCapacity?: number | null;
  cancellationPolicy?: string | null;
  // "HH:MM" strings (what an <input type="time"> gives you) - converted
  // to the plain 0-23 integer hour Hostaway's API actually expects (e.g.
  // "15:00" -> 15) inside createHostawayListing. Confirmed live
  // (2026-09-15): passing "HH:MM" strings directly is silently ignored,
  // not rejected - the listing still creates fine, just without these
  // fields set, which is how this was first caught.
  checkInTimeStart?: string | null;
  checkInTimeEnd?: string | null;
  checkOutTime?: string | null;
  minNights?: number | null;
  maxNights?: number | null;
  instantBookable?: boolean;
  cleaningFee?: number | null;
  refundableDamageDeposit?: number | null;
  houseRules?: string | null;
  description?: string | null;
  amenityIds: number[];
};

// POST /v1/listings - creates a listing that exists in Hostaway but is
// NOT exported/published to any channel (export is a separate, explicit
// dashboard action - see src/lib/licenses.ts's caveat about the same
// distinction for updates). That's deliberate: the user adds photos and
// publishes manually once the listing is ready.
function hourFromTimeString(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const hour = parseInt(value.split(":")[0], 10);
  return Number.isFinite(hour) && hour >= 0 && hour <= 23 ? hour : undefined;
}

export async function createHostawayListing(
  token: string,
  input: CreateListingInput
): Promise<{ id: number }> {
  const body: Record<string, unknown> = {
    name: input.name,
    externalListingName: input.name,
    address: input.address,
    city: input.city || undefined,
    state: input.state || undefined,
    zipcode: input.zipcode || undefined,
    bedroomsNumber: input.bedroomsNumber,
    bathroomsNumber: input.bathroomsNumber,
    price: input.price,
    currencyCode: input.currencyCode,
    guestsIncluded: input.guestsIncluded,
    priceForExtraPerson: input.priceForExtraPerson,
    personCapacity: input.personCapacity ?? undefined,
    cancellationPolicy: input.cancellationPolicy || undefined,
    checkInTimeStart: hourFromTimeString(input.checkInTimeStart),
    checkInTimeEnd: hourFromTimeString(input.checkInTimeEnd),
    checkOutTime: hourFromTimeString(input.checkOutTime),
    minNights: input.minNights ?? undefined,
    maxNights: input.maxNights ?? undefined,
    instantBookable: input.instantBookable ?? undefined,
    cleaningFee: input.cleaningFee ?? undefined,
    refundableDamageDeposit: input.refundableDamageDeposit ?? undefined,
    houseRules: input.houseRules || undefined,
    description: input.description || undefined,
    listingAmenities: input.amenityIds.map((amenityId) => ({ amenityId })),
  };

  const res = await fetch(LISTINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const responseBody = await res.text();
    throw new Error(`Hostaway listing creation failed: ${res.status} ${responseBody.slice(0, 400)}`);
  }

  const data = (await res.json()) as { result: { id: number } };
  return { id: data.result.id };
}

export type HostawaySyncResult = {
  created: number;
  updated: number;
  totalListings: number;
};

export async function syncHostawayListings(): Promise<HostawaySyncResult> {
  const credentials = await getHostawayCredentials();

  if (!credentials) {
    throw new Error(
      "No Hostaway credentials configured. Add them on the Settings page, or set HOSTAWAY_ACCOUNT_ID and HOSTAWAY_API_KEY as environment variables."
    );
  }

  const token = await getAccessToken(credentials.accountId, credentials.apiKey);
  const listings = await fetchAllListings(token);

  let created = 0;
  let updated = 0;

  for (const listing of listings) {
    const mapped = mapListing(listing);

    const existing = await prisma.property.findUnique({
      where: { hostaway_listing_id: mapped.hostawayId },
    });

    if (existing) {
      await prisma.property.update({
        where: { id: existing.id },
        data: {
          name_address: mapped.name,
          unit_count: mapped.unitCount,
          address: mapped.address,
          bedrooms: mapped.bedrooms,
          bathrooms: mapped.bathrooms,
          airbnb_status: mapped.airbnbStatus,
          timezone: mapped.timezone,
        },
      });
      updated += 1;
    } else {
      await prisma.property.create({
        data: {
          name_address: mapped.name,
          address: mapped.address,
          bedrooms: mapped.bedrooms,
          bathrooms: mapped.bathrooms,
          airbnb_status: mapped.airbnbStatus,
          timezone: mapped.timezone,
          type: "STR",
          unit_count: mapped.unitCount,
          assigned_cleaning_team: null,
          restock_frequency_days: 14,
          urgent_restock_requested: false,
          active: true,
          hostaway_listing_id: mapped.hostawayId,
          source: "Hostaway",
        },
      });
      created += 1;
    }
  }

  return { created, updated, totalListings: listings.length };
}
