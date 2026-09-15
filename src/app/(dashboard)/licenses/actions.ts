"use server";

import { revalidatePath } from "next/cache";
import { checkExpiringLicenses, syncLicensesToHostaway } from "@/lib/licenses";

export async function runLicenseCheckAction(
  _prevState: string | undefined,
  _formData: FormData
): Promise<string> {
  const result = await checkExpiringLicenses();
  revalidatePath("/licenses");

  if (result.alerted === 0) {
    return `Checked ${result.checked} license${result.checked === 1 ? "" : "s"} — none due for an alert.`;
  }

  let message = `Checked ${result.checked}, alerted on ${result.alerted}.`;
  if (result.emailError) message += ` Email issue: ${result.emailError}`;
  return message;
}

export async function runHostawayLicenseSyncAction(
  _prevState: string | undefined,
  _formData: FormData
): Promise<string> {
  try {
    const result = await syncLicensesToHostaway();
    revalidatePath("/licenses");

    const parts = [`Checked ${result.checked}`, `updated ${result.updated} in Hostaway`];
    if (result.skippedNoHostawayListing > 0) {
      parts.push(`${result.skippedNoHostawayListing} skipped (not a Hostaway listing)`);
    }
    let message = parts.join(", ") + ".";
    if (result.errors.length > 0) {
      message += ` Errors: ${result.errors.slice(0, 3).join("; ")}`;
    }
    return message;
  } catch (error) {
    return error instanceof Error ? `Sync failed: ${error.message}` : "Sync failed.";
  }
}
