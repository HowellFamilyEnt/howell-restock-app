"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

// Drop-in replacement for a plain `<button type="submit">Save</button>`
// inside a server-action form - shows "Saving..." while pending, then
// flashes "Saved" for a couple seconds. Uses useFormStatus, which tracks
// the nearest parent <form>'s pending state automatically, so no action
// signatures need to change to get this feedback.
export default function SaveButton({
  label = "Save",
  size = "md",
}: {
  label?: string;
  size?: "sm" | "md";
}) {
  const { pending } = useFormStatus();
  const [justSaved, setJustSaved] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending) {
      setJustSaved(true);
      const timeout = setTimeout(() => setJustSaved(false), 2000);
      return () => clearTimeout(timeout);
    }
    wasPending.current = pending;
  }, [pending]);

  const buttonClass =
    size === "sm"
      ? "shrink-0 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
      : "rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50";
  const savedClass = size === "sm" ? "text-xs text-green-600" : "text-sm text-green-600";

  return (
    <span className="inline-flex items-center gap-2">
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Saving..." : label}
      </button>
      {justSaved && <span className={savedClass}>Saved ✓</span>}
    </span>
  );
}
