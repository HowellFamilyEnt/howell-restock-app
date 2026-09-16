"use client";

import { useState } from "react";

type Property = { id: string; label: string; status: "not_ready" | "ready" | "occupied" };

const STATUS_STYLES: Record<Property["status"], string> = {
  not_ready: "bg-red-100 text-red-700",
  ready: "bg-green-100 text-green-700",
  occupied: "bg-gray-200 text-gray-600",
};

const STATUS_LABELS: Record<Property["status"], string> = {
  not_ready: "Not ready",
  ready: "Ready",
  occupied: "Occupied",
};

export default function CleaningStatusForm({
  properties,
  action,
}: {
  properties: Property[];
  action: (propertyId: string, status: "not_ready" | "ready") => Promise<void>;
}) {
  const [propertyId, setPropertyId] = useState("");
  const [pending, setPending] = useState(false);

  const selected = properties.find((p) => p.id === propertyId);

  async function toggle() {
    if (!selected || selected.status === "occupied") return;
    setPending(true);
    try {
      await action(selected.id, selected.status === "ready" ? "not_ready" : "ready");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Property</label>
        <select
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Select a property...</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <div className="flex items-center justify-between gap-3 rounded-md bg-gray-50 px-3 py-3">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[selected.status]}`}>
            {STATUS_LABELS[selected.status]}
          </span>
          {selected.status === "occupied" ? (
            <span className="text-xs text-gray-400">Set automatically while a guest is checked in</span>
          ) : (
            <button
              type="button"
              onClick={toggle}
              disabled={pending}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {pending ? "Saving..." : selected.status === "ready" ? "Mark Not ready" : "Mark Ready"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
