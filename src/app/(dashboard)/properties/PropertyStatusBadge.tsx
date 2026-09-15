"use client";

import { useState } from "react";

// Green/red reflects whether the listing is actually live on Airbnb right
// now (Hostaway's airbnbExportStatus, cached from the last "Sync from
// Hostaway" run) - separate from `active`, this app's own archive flag,
// which the popup lets you change. airbnbExportStatus is null both for
// "never synced" and for "synced, but Hostaway says not exported" - in
// practice these read the same to the user (not live on Airbnb), so both
// show red rather than a confusing third "not synced" state. Manually
// entered (non-Hostaway) properties have no Airbnb status at all, so they
// show a neutral badge instead of a misleading red.
export default function PropertyStatusBadge({
  propertyName,
  isHostaway,
  airbnbStatus,
  isActive,
  toggleActiveAction,
}: {
  propertyName: string;
  isHostaway: boolean;
  airbnbStatus: string | null;
  isActive: boolean;
  toggleActiveAction: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  const badge = !isHostaway
    ? { label: "—", className: "bg-gray-100 text-gray-500" }
    : airbnbStatus === "exported"
      ? { label: "Active", className: "bg-green-100 text-green-700" }
      : { label: "Not Active", className: "bg-red-100 text-red-700" };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
      >
        {badge.label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-1 text-sm font-semibold text-gray-900">{propertyName}</h3>
            <p className="mb-4 text-sm text-gray-500">
              {!isHostaway
                ? "Not a Hostaway-synced listing, so there's no Airbnb status to show."
                : airbnbStatus === "exported"
                  ? "Currently live/bookable on Airbnb, as of the last Hostaway sync."
                  : "Not currently live on Airbnb, as of the last Hostaway sync."}
            </p>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-700">
                {isActive ? "Active in this app" : "Archived in this app"}
              </span>
              <form action={toggleActiveAction}>
                <button
                  type="submit"
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {isActive ? "Archive" : "Restore"}
                </button>
              </form>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 text-xs text-gray-400 hover:text-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
