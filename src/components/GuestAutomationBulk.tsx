"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { bulkSetGuestAutomation } from "@/app/(dashboard)/properties/actions";

type SelectionContextValue = {
  selected: Set<string>;
  toggle: (id: string) => void;
};

const SelectionContext = createContext<SelectionContextValue | null>(null);

// Wraps the whole grouped property table (every area's <details> section)
// so checkboxes in different groups all share one selection - a plain
// prop can't cross that many independently-rendered server-rendered
// groups, so this is the one piece of client state the page needs.
export function GuestAutomationProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <SelectionContext.Provider value={{ selected, toggle }}>
      {children}
      <GuestAutomationBulkBar />
    </SelectionContext.Provider>
  );
}

function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("GuestAutomationProvider is missing");
  return ctx;
}

export function PropertyAutomationCheckbox({ propertyId }: { propertyId: string }) {
  const { selected, toggle } = useSelection();
  return (
    <input
      type="checkbox"
      checked={selected.has(propertyId)}
      onChange={() => toggle(propertyId)}
      aria-label="Select for bulk guest-automation update"
      className="h-4 w-4 rounded border-gray-300"
    />
  );
}

// Sticky bar rendered once (by the provider, after its children) rather
// than per-area, since selection spans every group - shows a running
// count and only enables the two buttons once something's checked.
function GuestAutomationBulkBar() {
  const { selected } = useSelection();
  const [pending, startTransition] = useTransition();

  function apply(enabled: boolean) {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    startTransition(async () => {
      await bulkSetGuestAutomation(ids, enabled);
    });
  }

  if (selected.size === 0) return null;

  return (
    <div className="sticky top-4 z-10 flex items-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2 shadow-sm">
      <span className="text-sm font-medium text-gray-700">{selected.size} selected</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => apply(true)}
        className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {pending ? "Updating..." : "Turn Guest Automation ON"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => apply(false)}
        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {pending ? "Updating..." : "Turn Guest Automation OFF"}
      </button>
    </div>
  );
}
