import { prisma } from "@/lib/prisma";
import CredentialForm from "./CredentialForm";
import AccessLinksSection from "./AccessLinksSection";
import { toggleGuestAutomation } from "./actions";
import { baseUrl } from "@/lib/workorders";

const WEBHOOK_URL_PATH = "/api/webhooks/hostaway";

function mask(value: string | null | undefined): string | null {
  if (!value) return null;
  const tail = value.slice(-4);
  return `${"•".repeat(Math.max(value.length - 4, 4))}${tail}`;
}

export default async function SettingsPage() {
  const settings = await prisma.integrationSettings.findUnique({ where: { id: "hostaway" } });
  const accessLinks = await prisma.accessLink.findMany({ orderBy: { createdAt: "desc" } });
  const properties = await prisma.property.findMany({
    where: { active: true },
    select: { id: true, name_address: true },
    orderBy: { name_address: "asc" },
  });

  const hostawayEnvConfigured = Boolean(process.env.HOSTAWAY_ACCOUNT_ID && process.env.HOSTAWAY_API_KEY);
  const emailEnvConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
  const smsEnvConfigured = Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER
  );
  const storageEnvConfigured = Boolean(
    process.env.SUPABASE_PROJECT_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const guestAutomationEnabled = settings?.guest_automation_enabled ?? false;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Integration credentials</p>
      </div>

      <div
        className={`rounded-lg border p-6 ${
          guestAutomationEnabled ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-white"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="mb-1 text-sm font-semibold text-gray-900">Guest automation</h2>
            <p className="text-sm text-gray-600">
              Master switch for everything guest-facing — direct booking confirmations and smart-access
              door codes. Off by default so nothing reaches a real guest while it&apos;s being tested;
              SuiteOp keeps handling guests in the meantime. Individual properties can also be excluded
              on their own page even while this is on.
            </p>
          </div>
          <form action={toggleGuestAutomation.bind(null, !guestAutomationEnabled)}>
            <button
              type="submit"
              className={`shrink-0 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium ${
                guestAutomationEnabled
                  ? "bg-amber-600 text-white hover:bg-amber-700"
                  : "bg-gray-900 text-white hover:bg-gray-700"
              }`}
            >
              {guestAutomationEnabled ? "On — turn off" : "Off — turn on"}
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Preview guest portal</h2>
        <p className="mb-4 text-sm text-gray-500">
          See (and test) what a guest sees for any property — placeholder dates, no real reservation
          needed. Never sends anything.
        </p>
        <form action="/guest-preview" className="flex items-end gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium text-gray-700">Property</label>
            <select
              name="propertyId"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select a property...</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name_address}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Preview
          </button>
        </form>
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
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Hostaway Webhook</h2>
        <p className="mb-2 text-sm text-gray-500">
          Sends guests a direct email + text within minutes of booking — bypassing Hostaway&apos;s own
          message thread, where VRBO blocks links. In Hostaway: Settings → Integrations → Webhooks →
          create one for the <span className="font-medium">reservation created</span> event, pointing at:
        </p>
        <p className="mb-4 rounded-md bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700">
          {baseUrl()}
          {WEBHOOK_URL_PATH}
        </p>
        <p className="mb-4 text-sm text-gray-500">
          Set a Login/Password when creating it in Hostaway, and enter the same pair below — this
          endpoint rejects any request that doesn&apos;t send them back.
        </p>
        <CredentialForm
          fields={[
            {
              name: "hostaway_webhook_username",
              label: "Login",
              masked: settings?.hostaway_webhook_username ?? null,
            },
            {
              name: "hostaway_webhook_password",
              label: "Password",
              masked: mask(settings?.hostaway_webhook_password),
            },
          ]}
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Seam (Smart Locks)</h2>
        <p className="mb-4 text-sm text-gray-500">
          Powers the per-property Smart lock and vendor access code sections on each property&apos;s
          page. Get an API key from your Seam workspace dashboard.
        </p>
        <CredentialForm
          fields={[{ name: "seam_api_key", label: "API Key", masked: mask(settings?.seam_api_key) }]}
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Slack</h2>
        <p className="mb-4 text-sm text-gray-500">
          Posts upgrade requests to your #upsell channel and reacts ✅/❌ once decided. Create a Slack
          app at api.slack.com/apps with <span className="font-mono text-xs">chat:write</span> and{" "}
          <span className="font-mono text-xs">reactions:write</span> bot scopes, install it, invite the
          bot into the channel, then enter its Bot User OAuth Token (starts with{" "}
          <span className="font-mono text-xs">xoxb-</span>) and the channel&apos;s ID below.
        </p>
        <CredentialForm
          fields={[
            { name: "slack_bot_token", label: "Bot Token", masked: mask(settings?.slack_bot_token) },
            {
              name: "slack_channel_id",
              label: "Channel ID",
              masked: settings?.slack_channel_id ?? null,
              placeholder: "C0123456789",
            },
          ]}
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Stripe</h2>
        <p className="mb-4 text-sm text-gray-500">
          Charges guests for approved upgrade requests. Use test-mode keys (
          <span className="font-mono text-xs">sk_test_...</span> /{" "}
          <span className="font-mono text-xs">pk_test_...</span>) first — fully testable with zero real
          money, using Stripe&apos;s standard test card 4242 4242 4242 4242.
        </p>
        <CredentialForm
          fields={[
            { name: "stripe_secret_key", label: "Secret Key", masked: mask(settings?.stripe_secret_key) },
            {
              name: "stripe_publishable_key",
              label: "Publishable Key",
              masked: settings?.stripe_publishable_key ?? null,
              placeholder: "pk_test_...",
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
