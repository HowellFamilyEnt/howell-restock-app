"use client";

import { useState } from "react";

export type PropertyOption = { id: string; label: string };

// Drop-in replacement for a plain `<select>` of properties - a text field
// that doubles as the search box (typing filters the option list shown
// below it) and, once JS has hydrated, still submits the same way a
// native select would: a hidden `name`-ed input carries the actual
// property id, so every existing server action reading
// formData.get("property_id") keeps working unchanged.
//
// `draft` (not `defaultValue`) is the only piece of local edit-in-progress
// state - null means "not currently typing," so the input just displays
// the selected option's label, computed fresh each render rather than
// synced via an effect. Clicking an option (mousedown, prevented so the
// input never actually blurs) commits it and clears the draft; blurring
// for any other reason discards an uncommitted, non-matching draft.
export default function PropertySearchSelect({
  properties,
  name,
  defaultValue = "",
  placeholder = "Search properties...",
  required,
  emptyOption,
  onSelect,
}: {
  properties: PropertyOption[];
  // Omit `name` when the select lives outside the form(s) it feeds (e.g.
  // a shared picker whose value is injected into a sibling form's
  // FormData at submit time) - use `onSelect` in that case instead.
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  emptyOption?: string;
  onSelect?: (id: string) => void;
}) {
  const options = emptyOption ? [{ id: "", label: emptyOption }, ...properties] : properties;

  const [selectedId, setSelectedId] = useState(defaultValue);
  const selectedLabel = options.find((p) => p.id === selectedId)?.label ?? "";

  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const displayValue = draft ?? selectedLabel;
  const filtered =
    draft === null || draft.trim() === ""
      ? options
      : options.filter((p) => p.label.toLowerCase().includes(draft.trim().toLowerCase()));

  function choose(p: PropertyOption) {
    setSelectedId(p.id);
    setDraft(null);
    setOpen(false);
    onSelect?.(p.id);
  }

  function closeAndRevert() {
    setOpen(false);
    setDraft(null);
  }

  return (
    <div className="relative">
      {name && <input type="hidden" name={name} value={selectedId} />}
      <input
        type="text"
        value={displayValue}
        required={required}
        onChange={(e) => {
          setDraft(e.target.value);
          setOpen(true);
        }}
        onFocus={(e) => {
          setOpen(true);
          e.target.select();
        }}
        onBlur={closeAndRevert}
        onKeyDown={(e) => {
          if (e.key === "Enter" && filtered.length > 0) {
            e.preventDefault();
            choose(filtered[0]);
          } else if (e.key === "Escape") {
            closeAndRevert();
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white text-sm shadow-lg">
          {filtered.length === 0 && <li className="px-3 py-2 text-gray-400">No matches</li>}
          {filtered.map((p) => (
            <li
              key={p.id || "__empty__"}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(p);
              }}
              className={`cursor-pointer px-3 py-2 hover:bg-gray-100 ${
                p.id === selectedId ? "bg-gray-50 font-medium text-gray-900" : "text-gray-700"
              }`}
            >
              {p.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
