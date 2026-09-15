"use client";

import { useActionState } from "react";
import { runHostawayLicenseSyncAction } from "./actions";

export default function CheckHostawayLicensesButton() {
  const [message, formAction, pending] = useActionState(runHostawayLicenseSyncAction, undefined);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {pending ? "Checking Hostaway..." : "Check against Hostaway"}
      </button>
      {message && <p className="max-w-xs text-right text-xs text-gray-500">{message}</p>}
    </form>
  );
}
