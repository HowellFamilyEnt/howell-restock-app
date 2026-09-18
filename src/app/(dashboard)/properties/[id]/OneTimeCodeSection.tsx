"use client";

import { useTransition } from "react";
import { issueOneTimeCode } from "./actions";

export default function OneTimeCodeSection({
  propertyId,
  activeCode,
  activeExpiresAt,
}: {
  propertyId: string;
  activeCode: string | null;
  activeExpiresAt: string | null; // ISO string, already confirmed not-yet-expired by the page
}) {
  const [pending, startTransition] = useTransition();

  function issue() {
    startTransition(async () => {
      await issueOneTimeCode(propertyId);
    });
  }

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <h3 className="mb-1 text-sm font-medium text-gray-700">One-time code</h3>
      <p className="mb-3 text-sm text-gray-500">
        A single-use code you can hand out on the spot - visible here for 2 hours, then it drops off
        (it also stops working on the lock at that point if never used).
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
    </div>
  );
}
