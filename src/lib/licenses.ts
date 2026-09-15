import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/notify";
import { getServiceAdminEmail, getHostawayCredentials } from "@/lib/settings";
import {
  getAccessToken,
  fetchListingLicenseFields,
  updateListingLicenseFields,
  type HostawayListingLicenseFields,
} from "@/lib/hostaway";

export const LICENSE_ALERT_WINDOW_DAYS = 60;

export type LicenseStatus = "Active" | "ExpiringSoon" | "Expired" | "NotSet";

export function computeLicenseStatus(
  expirationDate: Date | null,
  now: Date = new Date()
): LicenseStatus {
  if (!expirationDate) return "NotSet";
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntil = Math.ceil((expirationDate.getTime() - now.getTime()) / msPerDay);
  if (daysUntil < 0) return "Expired";
  if (daysUntil <= LICENSE_ALERT_WINDOW_DAYS) return "ExpiringSoon";
  return "Active";
}

export type LicenseCheckResult = {
  checked: number;
  alerted: number;
  emailError: string | null;
};

// Finds every property whose license is expired or within the 60-day
// window and hasn't already been alerted on for its current
// expiration_date, emails the service admin one digest listing all of
// them, then stamps license_alert_sent_for so the same license doesn't
// re-alert every day for the rest of the window. Renewing a license
// (changing expiration_date via updateLicenseInfo) clears that stamp,
// so a re-alert can fire again as the new date approaches.
export async function checkExpiringLicenses(): Promise<LicenseCheckResult> {
  const properties = await prisma.property.findMany({
    where: { license_expiration_date: { not: null } },
    orderBy: { license_expiration_date: "asc" },
  });

  const now = new Date();
  const due = properties.filter((p) => {
    const status = computeLicenseStatus(p.license_expiration_date, now);
    if (status !== "ExpiringSoon" && status !== "Expired") return false;
    if (!p.license_alert_sent_for) return true;
    return p.license_alert_sent_for.getTime() !== p.license_expiration_date!.getTime();
  });

  const result: LicenseCheckResult = { checked: properties.length, alerted: 0, emailError: null };
  if (due.length === 0) return result;

  const adminEmail = await getServiceAdminEmail();
  if (adminEmail) {
    const lines = [
      `${due.length} short-term rental license${due.length === 1 ? "" : "s"} expired or expiring within ${LICENSE_ALERT_WINDOW_DAYS} days:`,
      "",
      ...due.map((p) => {
        const status = computeLicenseStatus(p.license_expiration_date, now);
        const expires = p.license_expiration_date!.toISOString().slice(0, 10);
        return `[${status}] ${p.name_address} — license ${p.license_number ?? "?"}, expires ${expires}${p.license_owner ? `, owner ${p.license_owner}` : ""}`;
      }),
    ];
    result.emailError = await sendEmail(adminEmail, "STR license renewals due", lines.join("\n"));
  } else {
    result.emailError = "No service admin email configured.";
  }

  await prisma.$transaction(
    due.map((p) =>
      prisma.property.update({
        where: { id: p.id },
        data: { license_alert_sent_for: p.license_expiration_date },
      })
    )
  );
  result.alerted = due.length;

  return result;
}

export type HostawayLicenseSyncResult = {
  checked: number;
  updated: number;
  confirmed: number;
  skippedNoHostawayListing: number;
  errors: string[];
};

function dateToYmd(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

// A short pause between each Hostaway request (not each property, since
// a changed property makes 2 - fetch, then update) - Hostaway allows 15
// req/10s per IP, so ~700ms keeps a safety margin under that while
// keeping this reasonably fast for a manual button with a lot of
// properties to check.
const REQUEST_SPACING_MS = 700;
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Pushes our license data into each Hostaway-sourced property's listing,
// but only for properties where we actually have license data set - never
// clears a Hostaway field just because ours is blank. Skips properties
// with no hostaway_listing_id (LTR/HUD-VASH, or manually-entered STR
// properties) since there's no Hostaway listing to update.
//
// Whether Hostaway's PUT /v1/listings/{id} alone re-exports the change to
// Airbnb, or needs the dashboard's separate "Save & Export"/"Export
// Listing" action too, isn't documented - see the caveat on the Licenses
// page. Even once exported, Hostaway's own docs say Airbnb's review of
// license/permit data can take 2-3 days before it's reflected there.
export async function syncLicensesToHostaway(): Promise<HostawayLicenseSyncResult> {
  const credentials = await getHostawayCredentials();
  if (!credentials) {
    throw new Error(
      "No Hostaway credentials configured. Add them on the Settings page, or set HOSTAWAY_ACCOUNT_ID and HOSTAWAY_API_KEY as environment variables."
    );
  }

  const properties = await prisma.property.findMany({
    where: {
      OR: [
        { license_number: { not: null } },
        { license_type: { not: null } },
        { license_issue_date: { not: null } },
        { license_expiration_date: { not: null } },
      ],
    },
  });

  const result: HostawayLicenseSyncResult = {
    checked: properties.length,
    updated: 0,
    confirmed: 0,
    skippedNoHostawayListing: 0,
    errors: [],
  };
  if (properties.length === 0) return result;

  const token = await getAccessToken(credentials.accountId, credentials.apiKey);
  // Collected and written in one batched updateMany after the loop below,
  // rather than one prisma call per property - this loop can run for
  // minutes (paced Hostaway requests), and a DB write on every iteration
  // risks exhausting the connection pool if anything else hits the DB
  // while it's running (confirmed live: this happened during testing).
  const confirmedIds: string[] = [];

  for (const property of properties) {
    if (!property.hostaway_listing_id) {
      result.skippedNoHostawayListing += 1;
      continue;
    }

    try {
      const current = await fetchListingLicenseFields(token, property.hostaway_listing_id);
      await sleep(REQUEST_SPACING_MS);

      const diffs: Partial<HostawayListingLicenseFields> = {};
      if (property.license_number && property.license_number !== (current.propertyLicenseNumber ?? null)) {
        diffs.propertyLicenseNumber = property.license_number;
      }
      if (property.license_type && property.license_type !== (current.propertyLicenseType ?? null)) {
        diffs.propertyLicenseType = property.license_type;
      }
      // propertyLicenseIssueDate is deliberately never synced - our
      // license_issue_date was imported as the spreadsheet's "Effective
      // Date" column, while Hostaway's field tracks "Date Issued"; those
      // can differ by months, and overwriting Hostaway's real issue dates
      // with a different date isn't something to do silently. Number,
      // type, and expiration date are unambiguous enough to sync.
      const ourExpirationDate = dateToYmd(property.license_expiration_date);
      if (
        ourExpirationDate &&
        ourExpirationDate !== (current.propertyLicenseExpirationDate?.slice(0, 10) ?? null)
      ) {
        diffs.propertyLicenseExpirationDate = ourExpirationDate;
      }

      if (Object.keys(diffs).length > 0) {
        await updateListingLicenseFields(token, property.hostaway_listing_id, diffs);
        result.updated += 1;
        await sleep(REQUEST_SPACING_MS);
      }

      // Either it already matched, or the push above just made it match -
      // either way, number and expiration are now confirmed in sync.
      confirmedIds.push(property.id);
    } catch (error) {
      result.errors.push(
        `${property.name_address}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  if (confirmedIds.length > 0) {
    await prisma.property.updateMany({
      where: { id: { in: confirmedIds } },
      data: { license_hostaway_confirmed_at: new Date() },
    });
    result.confirmed = confirmedIds.length;
  }

  return result;
}
