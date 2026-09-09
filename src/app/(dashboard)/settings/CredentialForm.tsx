"use client";

import { useActionState } from "react";
import { saveCredentialFields, clearCredentialFields } from "./actions";

export default function CredentialForm({
  fields,
}: {
  fields: { name: string; label: string; masked: string | null; placeholder?: string }[];
}) {
  const fieldNames = fields.map((f) => f.name);
  const saveAction = saveCredentialFields.bind(null, fieldNames);
  const clearAction = clearCredentialFields.bind(null, fieldNames);
  const [message, formAction, pending] = useActionState(saveAction, undefined);

  const anyConfigured = fields.some((f) => f.masked);

  return (
    <div className="space-y-4">
      <form action={formAction} className="grid grid-cols-2 gap-4">
        {fields.map((field) => (
          <div key={field.name} className="space-y-1">
            <label className="text-sm font-medium text-gray-700">{field.label}</label>
            <input
              name={field.name}
              type={field.name.toLowerCase().includes("token") || field.name.toLowerCase().includes("key")
                ? "password"
                : "text"}
              placeholder={field.masked ?? field.placeholder ?? "Not set"}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            {field.masked && (
              <p className="text-xs text-gray-400">Currently: {field.masked}. Leave blank to keep it.</p>
            )}
          </div>
        ))}
        <div className="col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {pending ? "Saving..." : "Save"}
          </button>
          {message && <p className="text-sm text-gray-500">{message}</p>}
        </div>
      </form>

      {anyConfigured && (
        <form action={clearAction}>
          <button type="submit" className="text-xs text-red-600 hover:underline">
            Clear stored credentials
          </button>
        </form>
      )}
    </div>
  );
}
