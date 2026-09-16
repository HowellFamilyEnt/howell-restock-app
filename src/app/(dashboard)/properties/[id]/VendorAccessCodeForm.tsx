"use client";

import { useActionState } from "react";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

function formatHour(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelveHour}:00 ${period}`;
}

export default function VendorAccessCodeForm({
  action,
}: {
  action: (prevState: string | undefined, formData: FormData) => Promise<string>;
}) {
  const [message, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Label</label>
        <input
          name="label"
          placeholder="e.g. HVAC"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Starts</label>
          <div className="flex gap-2">
            <input
              name="starts_date"
              type="date"
              required
              className="w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
            />
            <select name="starts_hour" required className="rounded-md border border-gray-300 px-2 py-2 text-sm">
              {HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {formatHour(hour)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Ends</label>
          <div className="flex gap-2">
            <input
              name="ends_date"
              type="date"
              required
              className="w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
            />
            <select name="ends_hour" required className="rounded-md border border-gray-300 px-2 py-2 text-sm">
              {HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {formatHour(hour)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {pending ? "Issuing..." : "Issue code"}
      </button>
      {message && (
        <p className={`text-sm ${message.startsWith("Code issued") ? "text-green-600" : "text-red-600"}`}>
          {message}
        </p>
      )}
    </form>
  );
}
