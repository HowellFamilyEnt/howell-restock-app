"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import PropertySearchSelect from "@/components/PropertySearchSelect";

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

// One shared property dropdown drives both the note-flagging form and the
// "Cleaned" status button below it - both read the currently selected
// property_id at submit time (injected into FormData, since the <select>
// lives outside either <form>) rather than each keeping its own copy.
// Status badge and the Property page's own badge both come from the same
// activeCleaningStatuses() source (src/lib/cleaningStatus.ts), passed
// down here as `properties[].status` - never computed twice.
export default function CleaningPageForm({
  properties,
  noteAction,
  markCleanedAction,
}: {
  properties: Property[];
  noteAction: (prevState: string | undefined, formData: FormData) => Promise<string>;
  markCleanedAction: (prevState: string | undefined, formData: FormData) => Promise<string>;
}) {
  const [propertyId, setPropertyId] = useState("");
  const [noteMessage, dispatchNote, notePending] = useActionState(noteAction, undefined);
  const [cleanedMessage, dispatchCleaned, cleanedPending] = useActionState(markCleanedAction, undefined);

  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const photosRef = useRef<HTMLInputElement>(null);

  // Clears the note + photos after a successful send but leaves the
  // property selected - the crew is often reporting more than one item at
  // the same address in one visit.
  useEffect(() => {
    if (noteMessage?.startsWith("Sent")) {
      if (descriptionRef.current) descriptionRef.current.value = "";
      if (photosRef.current) photosRef.current.value = "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteMessage]);

  const selected = properties.find((p) => p.id === propertyId);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Property</label>
        <PropertySearchSelect
          onSelect={setPropertyId}
          placeholder="Select a property..."
          properties={properties.map((p) => ({ id: p.id, label: p.label }))}
        />
      </div>

      <form
        action={async (formData) => {
          formData.set("property_id", propertyId);
          await dispatchNote(formData);
          if (descriptionRef.current) descriptionRef.current.value = "";
          if (photosRef.current) photosRef.current.value = "";
        }}
        className="space-y-4"
      >
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">What&apos;s needed?</label>
          <textarea
            ref={descriptionRef}
            name="description"
            rows={4}
            required
            placeholder="e.g. out of paper towels, shampoo almost empty..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Photo (optional)</label>
          <input
            ref={photosRef}
            name="photos"
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-gray-700"
          />
        </div>

        <button
          type="submit"
          disabled={notePending}
          className="w-full rounded-md bg-gray-900 px-4 py-3 text-base font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {notePending ? "Sending..." : "Submit"}
        </button>

        {noteMessage && (
          <p className={`text-sm ${noteMessage.startsWith("Sent") ? "text-green-600" : "text-red-600"}`}>
            {noteMessage}
          </p>
        )}
      </form>

      {selected && (
        <div className="flex items-center justify-between gap-3 rounded-md bg-gray-50 px-3 py-3">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[selected.status]}`}>
            {STATUS_LABELS[selected.status]}
          </span>
          {selected.status === "occupied" && (
            <span className="text-xs text-gray-400">Can&apos;t mark cleaned while occupied</span>
          )}
        </div>
      )}

      <form
        action={async (formData) => {
          formData.set("property_id", propertyId);
          await dispatchCleaned(formData);
        }}
      >
        <button
          type="submit"
          disabled={!propertyId || selected?.status === "occupied" || cleanedPending}
          className="w-full rounded-md bg-green-600 px-4 py-3 text-base font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {cleanedPending ? "Saving..." : "Cleaned"}
        </button>
        {cleanedMessage && <p className="mt-1 text-sm text-gray-500">{cleanedMessage}</p>}
      </form>
    </div>
  );
}
