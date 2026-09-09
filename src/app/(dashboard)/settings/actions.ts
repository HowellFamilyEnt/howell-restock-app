"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function saveHostawayCredentials(
  _prevState: string | undefined,
  formData: FormData
): Promise<string> {
  const accountId = String(formData.get("hostaway_account_id") ?? "").trim();
  const apiKey = String(formData.get("hostaway_api_key") ?? "").trim();

  // Blank fields mean "leave the existing value alone" - the API key input
  // is never pre-filled with the real secret, so an empty submit shouldn't
  // wipe it out.
  const data: { hostaway_account_id?: string; hostaway_api_key?: string } = {};
  if (accountId) data.hostaway_account_id = accountId;
  if (apiKey) data.hostaway_api_key = apiKey;

  if (Object.keys(data).length === 0) {
    return "Nothing to save.";
  }

  await prisma.integrationSettings.upsert({
    where: { id: "hostaway" },
    update: data,
    create: { id: "hostaway", ...data },
  });

  revalidatePath("/settings");
  return "Saved.";
}

export async function clearHostawayCredentials(): Promise<void> {
  await prisma.integrationSettings.upsert({
    where: { id: "hostaway" },
    update: { hostaway_account_id: null, hostaway_api_key: null },
    create: { id: "hostaway" },
  });
  revalidatePath("/settings");
}
