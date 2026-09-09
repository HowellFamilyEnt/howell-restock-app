import { prisma } from "@/lib/prisma";
import CredentialForm from "./CredentialForm";

function mask(value: string | null | undefined): string | null {
  if (!value) return null;
  const tail = value.slice(-4);
  return `${"•".repeat(Math.max(value.length - 4, 4))}${tail}`;
}

export default async function SettingsPage() {
  const settings = await prisma.integrationSettings.findUnique({ where: { id: "hostaway" } });

  const hostawayEnvConfigured = Boolean(process.env.HOSTAWAY_ACCOUNT_ID && process.env.HOSTAWAY_API_KEY);
  const emailEnvConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
  const smsEnvConfigured = Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Integration credentials</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Hostaway</h2>
        <p className="mb-4 text-sm text-gray-500">
          Used by the &ldquo;Sync from Hostaway&rdquo; button on the Properties page. Find these in
          Hostaway: Settings → Integrations → API.
        </p>
        {hostawayEnvConfigured && (
          <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
            HOSTAWAY_ACCOUNT_ID / HOSTAWAY_API_KEY are set as environment variables on this
            deployment, so those take precedence over whatever is saved here.
          </p>
        )}
        <CredentialForm
          fields={[
            {
              name: "hostaway_account_id",
              label: "Account ID",
              masked: mask(settings?.hostaway_account_id),
            },
            {
              name: "hostaway_api_key",
              label: "Secret API Key",
              masked: mask(settings?.hostaway_api_key),
            },
          ]}
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Email (Resend)</h2>
        <p className="mb-4 text-sm text-gray-500">
          Used to email work order links to team members. Get an API key at resend.com and verify a
          sender address/domain there first.
        </p>
        {emailEnvConfigured && (
          <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
            RESEND_API_KEY / RESEND_FROM_EMAIL are set as environment variables on this deployment,
            so those take precedence over whatever is saved here.
          </p>
        )}
        <CredentialForm
          fields={[
            { name: "resend_api_key", label: "API Key", masked: mask(settings?.resend_api_key) },
            {
              name: "resend_from_email",
              label: "From address",
              masked: settings?.resend_from_email ?? null,
              placeholder: "restock@yourdomain.com",
            },
          ]}
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">SMS (Twilio)</h2>
        <p className="mb-4 text-sm text-gray-500">
          Used to text work order links to team members. Needs a Twilio account with a purchased
          phone number.
        </p>
        {smsEnvConfigured && (
          <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
            TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER are set as environment
            variables on this deployment, so those take precedence over whatever is saved here.
          </p>
        )}
        <CredentialForm
          fields={[
            { name: "twilio_account_sid", label: "Account SID", masked: mask(settings?.twilio_account_sid) },
            { name: "twilio_auth_token", label: "Auth Token", masked: mask(settings?.twilio_auth_token) },
            {
              name: "twilio_from_number",
              label: "From number",
              masked: settings?.twilio_from_number ?? null,
              placeholder: "+15551234567",
            },
          ]}
        />
      </div>
    </div>
  );
}
