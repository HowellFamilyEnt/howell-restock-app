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
};

type MappedListing = {
  hostawayId: string;
  name: string;
  unitCount: number;
  address: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
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
};

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
  };
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
