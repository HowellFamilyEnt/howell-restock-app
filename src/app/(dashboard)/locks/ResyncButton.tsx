"use client";

import { useActionState } from "react";
import { resyncSeamLocks } from "./actions";

export default function ResyncButton() {
  const [message, formAction, pending] = useActionState(async () => resyncSeamLocks(), undefined);

  return (
    <form action={formAction} className="flex items-center gap-3">
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {pending ? "Syncing..." : "Resync from Seam"}
      </button>
      {message && <span className="text-sm text-gray-500">{message}</span>}
    </form>
  );
}
