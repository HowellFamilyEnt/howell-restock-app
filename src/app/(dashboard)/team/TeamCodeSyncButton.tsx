"use client";

import { useActionState } from "react";
import { runTeamCodeSync } from "./actions";

export default function TeamCodeSyncButton() {
  const [message, formAction, pending] = useActionState(runTeamCodeSync, undefined);

  return (
    <form action={formAction} className="flex items-center gap-3">
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {pending ? "Syncing codes... this can take a minute" : "Sync team access codes"}
      </button>
      {message && <p className="text-sm text-gray-500">{message}</p>}
    </form>
  );
}
