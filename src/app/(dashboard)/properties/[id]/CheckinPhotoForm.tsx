"use client";

import { useActionState, useRef } from "react";

export default function CheckinPhotoForm({
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
      <div className="flex-1 space-y-1">
        <label className="text-sm font-medium text-gray-700">Caption</label>
        <input
          name="caption"
          placeholder="e.g. Enter through the north door"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Photo</label>
        <input
          name="photo"
          type="file"
          accept="image/*"
          capture="environment"
          className="block text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-gray-700"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
      >
        {pending ? "Uploading..." : "Add step"}
      </button>
      {message && <p className="w-full text-sm text-red-600">{message}</p>}
    </form>
  );
}
