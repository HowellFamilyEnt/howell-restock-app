"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { issueOneTimeCode } from "./actions";

export default function OneTimeCodeSection({
  propertyId,
  activeCode,
  activeExpiresAt,
  pending: codePending,
}: {
  propertyId: string;
  activeCode: string | null;
  activeExpiresAt: string | null; // ISO string, already confirmed not-yet-expired by the page
  // A row exists but Seam hasn't assigned the PIN yet (rare - the issuing
  // request itself polls for a few seconds first). Blocks a duplicate
  // click while the check-lock-health cron finishes it off.
  pending: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function issue() {
    setError(null);
    startTransition(async () => {
      const result = await issueOneTimeCode(propertyId);
      if (result) {
        setError(result);
      } else {
        // A server action called directly (not via <form action>) doesn't
        // auto-refresh the page the way a form submission does - without
        // this, the newly-created code would never actually show up here.
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <h3 className="mb-1 text-sm font-medium text-gray-700">One-time code</h3>
      <p className="mb-3 text-sm text-gray-500">
        A single-use code you can hand out on the spot - it self-destructs the moment it&apos;s used
        once. Shown here for 2 hours, then it drops off this page - but note it can&apos;t be manually
        removed before then (Seam doesn&apos;t allow deleting this type of code once it&apos;s set), so
        it stays live and unused on the lock until someone actually enters it.
      </p>

      {activeCode ? (
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-gray-100 px-3 py-2 font-mono text-lg font-semibold tracking-wide text-gray-900">
            {activeCode}
          </span>
          <span className="text-xs text-gray-400">
            Visible until {new Date(activeExpiresAt!).toLocaleString()}
          </span>
        </div>
      ) : codePending ? (
        <p className="text-sm text-gray-500">Still assigning a code — refresh in a moment.</p>
      ) : (
        <button
          type="button"
          onClick={issue}
          disabled={pending}
          className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
        >
          {pending ? "Issuing..." : "Issue one-time code"}
        </button>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
