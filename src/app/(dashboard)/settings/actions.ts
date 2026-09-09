"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

// Generic save/clear for any subset of IntegrationSettings' credential
// fields - used by the Hostaway, Email (Resend), and SMS (Twilio) sections
// on the Settings page. Blank fields mean "leave the existing value alone"
// (inputs are never pre-filled with the real secret), so an empty submit
// never wipes a saved credential.
export async function saveCredentialFields(
  fields: string[],
  _prevState: string | undefined,
  formData: FormData
): Promise<string> {
  const data: Record<string, string> = {};
  for (const field of fields) {
    const value = String(formData.get(field) ?? "").trim();
    if (value) data[field] = value;
  }

  if (Object.keys(data).length === 0) {
    return "Nothing to save.";
  }

  await prisma.integrationSettings.upsert({
    where: { id: "hostaway" },
    update: data as Prisma.IntegrationSettingsUpdateInput,
    create: { id: "hostaway", ...data },
  });

  revalidatePath("/settings");
  return "Saved.";
}

export async function clearCredentialFields(fields: string[]): Promise<void> {
  const data: Record<string, null> = {};
  for (const field of fields) data[field] = null;

  await prisma.integrationSettings.upsert({
    where: { id: "hostaway" },
    update: data as Prisma.IntegrationSettingsUpdateInput,
    create: { id: "hostaway" },
  });

  revalidatePath("/settings");
}
