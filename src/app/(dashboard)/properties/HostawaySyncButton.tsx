"use client";

import { useActionState } from "react";
import { runHostawaySync } from "./actions";

export default function HostawaySyncButton() {
  const [message, formAction, pending] = useActionState(runHostawaySync, undefined);

  return (
    <form action={formAction} className="flex items-center gap-3">
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {pending ? "Syncing..." : "Sync from Hostaway"}
      </button>
      {message && (
        <p className={`text-sm ${message.startsWith("Sync failed") ? "text-red-600" : "text-gray-500"}`}>
          {message}
        </p>
      )}
    </form>
  );
}
