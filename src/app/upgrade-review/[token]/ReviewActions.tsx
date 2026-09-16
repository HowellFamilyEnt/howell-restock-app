"use client";

import { useState } from "react";
import { decideUpgradeRequest } from "@/lib/upgradeRequest";

export default function ReviewActions({ token }: { token: string }) {
  const [name, setName] = useState("");
  const [pending, setPending] = useState<"approved" | "denied" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function decide(decision: "approved" | "denied") {
    setPending(decision);
    setMessage(null);
    const result = await decideUpgradeRequest(token, decision, name);
    setPending(null);
    setMessage(result);
    setDone(true);
  }

  if (done) {
    return <p className="text-sm text-gray-700">{message}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Your name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="So we know who decided"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => decide("approved")}
          disabled={pending !== null}
          className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {pending === "approved" ? "Approving..." : "Approve"}
        </button>
        <button
          type="button"
          onClick={() => decide("denied")}
          disabled={pending !== null}
          className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {pending === "denied" ? "Denying..." : "Deny"}
        </button>
      </div>
      {message && <p className="text-sm text-gray-500">{message}</p>}
    </div>
  );
}
