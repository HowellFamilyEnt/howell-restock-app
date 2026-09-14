"use client";

import { useActionState, useRef, useEffect, useState } from "react";

type Property = { id: string; label: string };

export default function CleaningForm({
  properties,
  action,
}: {
  properties: Property[];
  action: (prevState: string | undefined, formData: FormData) => Promise<string>;
}) {
  const [message, formAction, pending] = useActionState(action, undefined);
  const [propertyId, setPropertyId] = useState("");
  const selectRef = useRef<HTMLSelectElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const photosRef = useRef<HTMLInputElement>(null);

  // Clears the note + photos after a successful send but deliberately
  // leaves the property selected - the crew is often reporting more than
  // one item at the same address in one visit. React resets the whole
  // <form> after a Server Action succeeds, which wipes the select's DOM
  // value out from under our own `propertyId` state without triggering a
  // re-render (React's controlled-value diffing only compares against its
  // own last-rendered value, not the actual current DOM value) - so the
  // fix has to reassign the DOM value imperatively here, after that reset
  // already happened, rather than relying on the `value` prop alone.
  useEffect(() => {
    if (message?.startsWith("Sent")) {
      if (selectRef.current) selectRef.current.value = propertyId;
      if (descriptionRef.current) descriptionRef.current.value = "";
      if (photosRef.current) photosRef.current.value = "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Property</label>
        <select
          ref={selectRef}
          name="property_id"
          required
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
        disabled={pending}
        className="w-full rounded-md bg-gray-900 px-4 py-3 text-base font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {pending ? "Sending..." : "Submit"}
      </button>

      {message && (
        <p className={`text-sm ${message.startsWith("Sent") ? "text-green-600" : "text-red-600"}`}>
          {message}
        </p>
      )}
    </form>
  );
}
