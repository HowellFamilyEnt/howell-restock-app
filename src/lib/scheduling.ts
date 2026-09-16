import { prisma } from "@/lib/prisma";
import { getHostawayCredentials } from "@/lib/settings";
import {
  getAccessToken,
  fetchReservationsByArrivalWindow,
  type HostawayReservation,
} from "@/lib/hostaway";
import { addUtcDays } from "@/lib/calendar";

// Used only by the automated scheduling paths (the daily sweep and the
// 30-day auto-follow-up after a work order completes - see
// src/lib/workorders.ts). Manual work order creation respects whatever
// date the admin picks exactly, with no adjustment.
//
// Picks a visit date between 11:00 and 15:30 (per the user's request),
// never on a Sunday, and - for Hostaway-sourced properties - prefers an
// actual turnover day (a reservation's departureDate) near the target
// date, so the crew isn't sent to a currently-occupied unit.
//
// Simplification: Hostaway reservations do carry checkInTime/checkOutTime
// (confirmed on a live account, 2026-09-10), but as bare hour-of-day
// integers in the listing's *local* timezone, which this app doesn't
// otherwise track or convert - using them precisely risked a subtly wrong
// per-listing time calculation that's hard to verify without more live
// testing. So rather than compute an exact post-checkout / pre-checkin
// minute, every match is scheduled at a fixed 13:00 UTC, which sits inside
// the requested window regardless of timezone.
const SCHEDULE_HOUR_UTC = 13;

// How far to look for reservation data around the target date. The lookback
// is generous (45 days) because Hostaway only lets us filter by
// *arrivalDate* server-side (confirmed live - `listingMapId` alone does
// not filter, and the account has ~8,500 reservations total, so fetching
// everything isn't viable) - a guest who arrived well before the window
// can still occupy (or check out during) it.
const ARRIVAL_LOOKBACK_DAYS = 45;
const ARRIVAL_LOOKAHEAD_DAYS = 7;

function isSunday(date: Date): boolean {
  return date.getUTCDay() === 0;
}

function atScheduleTime(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(SCHEDULE_HOUR_UTC, 0, 0, 0);
  return result;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// target ± 0,1,2,3 days, target first, alternating forward/back, with
// Sundays dropped outright (not shifted - an adjacent candidate covers it).
function candidateDates(target: Date): Date[] {
  const offsets = [0, 1, -1, 2, -2, 3, -3];
  return offsets.map((o) => addUtcDays(target, o)).filter((d) => !isSunday(d));
}

// Fetches every reservation (across the whole account) arriving within
// ARRIVAL_LOOKBACK_DAYS..ARRIVAL_LOOKAHEAD_DAYS of targetDate. Meant to be
// called ONCE per batch of scheduling decisions that share a target date
// (e.g. once per daily sweep run, reused across every property due that
// day) rather than once per property - the sweep does this; the 30-day
// auto-follow-up (a single property, triggered by one work order
// completing) just calls it for itself. Returns [] on any failure -
// missing credentials, network error, or an unexpected response shape -
// so a Hostaway hiccup never blocks work order creation.
export async function fetchReservationsNear(targetDate: Date): Promise<HostawayReservation[]> {
  const credentials = await getHostawayCredentials();
  if (!credentials) return [];

  try {
    const token = await getAccessToken(credentials.accountId, credentials.apiKey);
    const start = isoDate(addUtcDays(targetDate, -ARRIVAL_LOOKBACK_DAYS));
    const end = isoDate(addUtcDays(targetDate, ARRIVAL_LOOKAHEAD_DAYS));
    return await fetchReservationsByArrivalWindow(token, start, end);
  } catch {
    return [];
  }
}

// Every listingMapId occupied on `date` (arrival <= date < departure)
// across the given reservations - factored out of computeScheduledTime's
// own per-property version below so callers who need the bulk answer
// (e.g. cleaningStatus.ts, computing "is anyone home today" for every
// property in one pass) don't refetch/recompute per property.
export function occupiedListingIdsOn(date: Date, reservations: HostawayReservation[]): Set<string> {
  const target = isoDate(date);
  const occupied = new Set<string>();
  for (const r of reservations) {
    let cursor = new Date(`${r.arrivalDate}T00:00:00Z`);
    const departure = new Date(`${r.departureDate}T00:00:00Z`);
    while (cursor < departure) {
      if (isoDate(cursor) === target) {
        occupied.add(String(r.listingMapId));
        break;
      }
      cursor = addUtcDays(cursor, 1);
    }
  }
  return occupied;
}

export async function computeScheduledTime(
  propertyId: string,
  targetDate: Date,
  reservations?: HostawayReservation[]
): Promise<Date> {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  const candidates = candidateDates(targetDate);
  const fallback = atScheduleTime(candidates[0] ?? addUtcDays(targetDate, 1));

  if (!property || property.source !== "Hostaway" || !property.hostaway_listing_id) {
    return fallback;
  }

  const allReservations = reservations ?? (await fetchReservationsNear(targetDate));
  const listingReservations = allReservations.filter(
    (r) => String(r.listingMapId) === property.hostaway_listing_id
  );
  if (listingReservations.length === 0) return fallback;

  const departureDates = new Set(listingReservations.map((r) => r.departureDate));
  const occupiedDates = new Set<string>();
  for (const r of listingReservations) {
    let cursor = new Date(`${r.arrivalDate}T00:00:00Z`);
    const departure = new Date(`${r.departureDate}T00:00:00Z`);
    while (cursor < departure) {
      occupiedDates.add(isoDate(cursor));
      cursor = addUtcDays(cursor, 1);
    }
  }

  // Prefer an actual turnover day (a checkout) in the search window.
  for (const date of candidates) {
    if (departureDates.has(isoDate(date))) return atScheduleTime(date);
  }
  // Otherwise, any day the property isn't occupied works.
  for (const date of candidates) {
    if (!occupiedDates.has(isoDate(date))) return atScheduleTime(date);
  }

  return fallback;
}
