"use client";

import { useState } from "react";

const NEW_OWNER_VALUE = "__new__";

// Picking an existing owner here moves the property into that owner's
// group on next render (groups are derived live from license_owner, not a
// separate table); typing a new one creates a new group the same way,
// automatically, the first time any property is saved with that name.
export default function OwnerField({
  owners,
  defaultValue,
}: {
  owners: string[];
  defaultValue: string;
}) {
  const startsAsNew = defaultValue !== "" && !owners.includes(defaultValue);
  const [isNew, setIsNew] = useState(startsAsNew);

  if (isNew) {
    return (
      <div className="flex items-center gap-1">
        <input
          name="license_owner"
          defaultValue={defaultValue}
          placeholder="New owner name"
          autoFocus
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
        {owners.length > 0 && (
          <button
            type="button"
            onClick={() => setIsNew(false)}
            title="Choose an existing owner instead"
            className="shrink-0 text-xs text-gray-400 hover:text-gray-600"
          >
            ↩
          </button>
        )}
      </div>
    );
  }

  return (
    <select
      name="license_owner"
      defaultValue={defaultValue}
      onChange={(e) => {
        if (e.target.value === NEW_OWNER_VALUE) setIsNew(true);
      }}
      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
    >
      <option value="">No owner</option>
      {owners.map((owner) => (
        <option key={owner} value={owner}>
          {owner}
        </option>
      ))}
      <option value={NEW_OWNER_VALUE}>+ New owner...</option>
    </select>
  );
}
