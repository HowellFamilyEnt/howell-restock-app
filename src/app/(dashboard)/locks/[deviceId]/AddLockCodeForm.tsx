"use client";

import { useActionState, useRef } from "react";

export default function AddLockCodeForm({
  action,
}: {
  action: (prevState: string | undefined, formData: FormData) => Promise<string>;
}) {
  const [message, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-gray-300 p-3"
    >
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Name</label>
        <input
          name="name"
          required
          placeholder="e.g. Plumber - one visit"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Code (optional)</label>
        <input
          name="code"
          placeholder="4-12 digits, or leave blank"
          pattern="\d{4,12}"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
      >
        {pending ? "Adding..." : "Add code"}
      </button>
      {message && <p className="w-full text-sm text-red-600">{message}</p>}
    </form>
  );
}
