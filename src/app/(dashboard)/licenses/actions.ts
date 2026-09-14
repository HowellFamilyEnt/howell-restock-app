"use server";

import { revalidatePath } from "next/cache";
import { checkExpiringLicenses } from "@/lib/licenses";

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
