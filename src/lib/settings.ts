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
