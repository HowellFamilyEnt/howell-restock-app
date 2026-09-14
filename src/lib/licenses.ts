import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/notify";
import { getServiceAdminEmail } from "@/lib/settings";

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
