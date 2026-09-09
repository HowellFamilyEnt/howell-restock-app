import { prisma } from "@/lib/prisma";
import SettingsForm from "./SettingsForm";

function mask(value: string | null | undefined): string | null {
  if (!value) return null;
  const tail = value.slice(-4);
  return `${"•".repeat(Math.max(value.length - 4, 4))}${tail}`;
}

export default async function SettingsPage() {
  const envConfigured = Boolean(process.env.HOSTAWAY_ACCOUNT_ID && process.env.HOSTAWAY_API_KEY);
  const settings = await prisma.integrationSettings.findUnique({ where: { id: "hostaway" } });

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

        {envConfigured && (
          <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
            HOSTAWAY_ACCOUNT_ID / HOSTAWAY_API_KEY are set as environment variables on this
            deployment, so those take precedence over whatever is saved here.
          </p>
        )}

        <SettingsForm
          maskedAccountId={mask(settings?.hostaway_account_id)}
          maskedApiKey={mask(settings?.hostaway_api_key)}
        />
      </div>
    </div>
  );
}
