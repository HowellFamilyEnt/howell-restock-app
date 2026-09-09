"use client";

import { useActionState } from "react";
import { saveHostawayCredentials, clearHostawayCredentials } from "./actions";

export default function SettingsForm({
  maskedAccountId,
  maskedApiKey,
}: {
  maskedAccountId: string | null;
  maskedApiKey: string | null;
}) {
  const [message, formAction, pending] = useActionState(saveHostawayCredentials, undefined);

  return (
    <div className="space-y-4">
      <form action={formAction} className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Hostaway Account ID</label>
          <input
            name="hostaway_account_id"
            placeholder={maskedAccountId ?? "Not set"}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {maskedAccountId && (
            <p className="text-xs text-gray-400">Currently: {maskedAccountId}. Leave blank to keep it.</p>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Hostaway Secret API Key</label>
          <input
            name="hostaway_api_key"
            type="password"
            placeholder={maskedApiKey ?? "Not set"}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {maskedApiKey && (
            <p className="text-xs text-gray-400">Currently: {maskedApiKey}. Leave blank to keep it.</p>
          )}
        </div>
        <div className="col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {pending ? "Saving..." : "Save"}
          </button>
          {message && <p className="text-sm text-gray-500">{message}</p>}
        </div>
      </form>

      {(maskedAccountId || maskedApiKey) && (
        <form action={clearHostawayCredentials}>
          <button type="submit" className="text-xs text-red-600 hover:underline">
            Clear stored Hostaway credentials
          </button>
        </form>
      )}
    </div>
  );
}
