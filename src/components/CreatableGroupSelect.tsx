"use client";

import { useState } from "react";

const NEW_VALUE = "__new__";

// Picking an existing option here moves the record into that group on
// next render (groups are derived live from whichever field `name`
// writes to, not a separate table); typing a new one creates a new group
// the same way, automatically, the first time any record is saved with
// that name. Shared by the Licenses page's Owner field and the
// Properties page's Area field - same behavior, different field/labels.
export default function CreatableGroupSelect({
  name,
  options,
  defaultValue,
  noneLabel = "None",
  newLabel = "+ New...",
  newPlaceholder = "New value",
}: {
  name: string;
  options: string[];
  defaultValue: string;
  noneLabel?: string;
  newLabel?: string;
  newPlaceholder?: string;
}) {
  const startsAsNew = defaultValue !== "" && !options.includes(defaultValue);
  const [isNew, setIsNew] = useState(startsAsNew);

  if (isNew) {
    return (
      <div className="flex items-center gap-1">
        <input
          name={name}
          defaultValue={defaultValue}
          placeholder={newPlaceholder}
          autoFocus
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
        {options.length > 0 && (
          <button
            type="button"
            onClick={() => setIsNew(false)}
            title="Choose an existing one instead"
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
      name={name}
      defaultValue={defaultValue}
      onChange={(e) => {
        if (e.target.value === NEW_VALUE) setIsNew(true);
      }}
      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
    >
      <option value="">{noneLabel}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
      <option value={NEW_VALUE}>{newLabel}</option>
    </select>
  );
}
