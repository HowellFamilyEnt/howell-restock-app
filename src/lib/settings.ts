import { prisma } from "@/lib/prisma";

export type HostawayCredentials = {
  accountId: string;
  apiKey: string;
};

// Env vars win if set (lets an ops-minded user manage the secret outside the
// app, e.g. via their hosting platform's secrets manager). Otherwise fall
// back to what was entered on the Settings page.
export async function getHostawayCredentials(): Promise<HostawayCredentials | null> {
  const envAccountId = process.env.HOSTAWAY_ACCOUNT_ID;
  const envApiKey = process.env.HOSTAWAY_API_KEY;
  if (envAccountId && envApiKey) {
    return { accountId: envAccountId, apiKey: envApiKey };
  }

  const settings = await prisma.integrationSettings.findUnique({ where: { id: "hostaway" } });
  if (settings?.hostaway_account_id && settings?.hostaway_api_key) {
    return { accountId: settings.hostaway_account_id, apiKey: settings.hostaway_api_key };
  }

  return null;
}
