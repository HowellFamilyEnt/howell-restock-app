import { prisma } from "@/lib/prisma";
import CredentialForm from "./CredentialForm";
import AccessLinksSection from "./AccessLinksSection";
import { baseUrl } from "@/lib/workorders";

function mask(value: string | null | undefined): string | null {
  if (!value) return null;
  const tail = value.slice(-4);
  return `${"•".repeat(Math.max(value.length - 4, 4))}${tail}`;
}

export default async function SettingsPage() {
  const settings = await prisma.integrationSettings.findUnique({ where: { id: "hostaway" } });
  const accessLinks = await prisma.accessLink.findMany({ orderBy: { createdAt: "desc" } });

  const hostawayEnvConfigured = Boolean(process.env.HOSTAWAY_ACCOUNT_ID && process.env.HOSTAWAY_API_KEY);
  const emailEnvConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
  const smsEnvConfigured = Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER
  );
  const storageEnvConfigured = Boolean(
    process.env.SUPABASE_PROJECT_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
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

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Photo storage (Supabase)</h2>
        <p className="mb-4 text-sm text-gray-500">
          Used to store photos attached to work order notes. In your Supabase project dashboard:
          Project Settings → API for the project URL and the{" "}
          <span className="font-medium">service_role</span> key (not the anon key — this one bypasses
          row-level security, so it&apos;s only ever used server-side here).
        </p>
        {storageEnvConfigured && (
          <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
            SUPABASE_PROJECT_URL / SUPABASE_SERVICE_ROLE_KEY are set as environment variables on this
            deployment, so those take precedence over whatever is saved here.
          </p>
        )}
        <CredentialForm
          fields={[
            {
              name: "supabase_project_url",
              label: "Project URL",
              masked: settings?.supabase_project_url ?? null,
              placeholder: "https://xxxxxxxx.supabase.co",
            },
            {
              name: "supabase_service_role_key",
              label: "Service role key",
              masked: mask(settings?.supabase_service_role_key),
            },
          ]}
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Service admin</h2>
        <p className="mb-4 text-sm text-gray-500">
          When a work order with notes is completed, its notes (and any photo links) are emailed here.
        </p>
        <CredentialForm
          fields={[
            {
              name: "service_admin_email",
              label: "Email address",
              masked: settings?.service_admin_email ?? null,
              placeholder: "maintenance@yourcompany.com",
            },
          ]}
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Team access links</h2>
        <p className="mb-4 text-sm text-gray-500">
          Shareable links that don&apos;t require a login — pick which sections each one can see (e.g.
          a &ldquo;Restocking Team&rdquo; link limited to Calendar, Log Restock, and Work Orders).
          Settings is never available through one of these links, no matter what&apos;s checked.
        </p>
        <AccessLinksSection
          links={accessLinks.map((l) => ({
            id: l.id,
            name: l.name,
            token: l.token,
            sections: l.sections,
            cleaning_enabled: l.cleaning_enabled,
            active: l.active,
          }))}
          baseUrl={baseUrl()}
        />
      </div>
    </div>
  );
}
