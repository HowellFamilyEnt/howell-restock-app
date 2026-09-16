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

export type EmailCredentials = {
  apiKey: string;
  fromEmail: string;
};

export async function getEmailCredentials(): Promise<EmailCredentials | null> {
  const envApiKey = process.env.RESEND_API_KEY;
  const envFromEmail = process.env.RESEND_FROM_EMAIL;
  if (envApiKey && envFromEmail) {
    return { apiKey: envApiKey, fromEmail: envFromEmail };
  }

  const settings = await prisma.integrationSettings.findUnique({ where: { id: "hostaway" } });
  if (settings?.resend_api_key && settings?.resend_from_email) {
    return { apiKey: settings.resend_api_key, fromEmail: settings.resend_from_email };
  }

  return null;
}

export type SupabaseStorageCredentials = {
  projectUrl: string;
  serviceRoleKey: string;
};

export async function getSupabaseStorageCredentials(): Promise<SupabaseStorageCredentials | null> {
  const envUrl = process.env.SUPABASE_PROJECT_URL;
  const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (envUrl && envKey) {
    return { projectUrl: envUrl, serviceRoleKey: envKey };
  }

  const settings = await prisma.integrationSettings.findUnique({ where: { id: "hostaway" } });
  if (settings?.supabase_project_url && settings?.supabase_service_role_key) {
    return { projectUrl: settings.supabase_project_url, serviceRoleKey: settings.supabase_service_role_key };
  }

  return null;
}

export async function getServiceAdminEmail(): Promise<string | null> {
  const envEmail = process.env.SERVICE_ADMIN_EMAIL;
  if (envEmail) return envEmail;

  const settings = await prisma.integrationSettings.findUnique({ where: { id: "hostaway" } });
  return settings?.service_admin_email ?? null;
}

export type HostawayWebhookCredentials = {
  username: string;
  password: string;
};

// Verifies the Basic Auth header Hostaway sends back on every webhook call
// (see src/app/api/webhooks/hostaway/route.ts) - set to whatever
// Login/Password was entered when the webhook was registered in Hostaway's
// dashboard.
export async function getHostawayWebhookCredentials(): Promise<HostawayWebhookCredentials | null> {
  const envUsername = process.env.HOSTAWAY_WEBHOOK_USERNAME;
  const envPassword = process.env.HOSTAWAY_WEBHOOK_PASSWORD;
  if (envUsername && envPassword) {
    return { username: envUsername, password: envPassword };
  }

  const settings = await prisma.integrationSettings.findUnique({ where: { id: "hostaway" } });
  if (settings?.hostaway_webhook_username && settings?.hostaway_webhook_password) {
    return { username: settings.hostaway_webhook_username, password: settings.hostaway_webhook_password };
  }

  return null;
}

export type SmsCredentials = {
  accountSid: string;
  authToken: string;
  fromNumber: string;
};

export async function getSmsCredentials(): Promise<SmsCredentials | null> {
  const envSid = process.env.TWILIO_ACCOUNT_SID;
  const envToken = process.env.TWILIO_AUTH_TOKEN;
  const envFrom = process.env.TWILIO_FROM_NUMBER;
  if (envSid && envToken && envFrom) {
    return { accountSid: envSid, authToken: envToken, fromNumber: envFrom };
  }

  const settings = await prisma.integrationSettings.findUnique({ where: { id: "hostaway" } });
  if (settings?.twilio_account_sid && settings?.twilio_auth_token && settings?.twilio_from_number) {
    return {
      accountSid: settings.twilio_account_sid,
      authToken: settings.twilio_auth_token,
      fromNumber: settings.twilio_from_number,
    };
  }

  return null;
}
