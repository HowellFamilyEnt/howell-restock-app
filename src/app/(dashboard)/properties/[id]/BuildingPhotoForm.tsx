"use client";

import { useActionState, useRef } from "react";

export default function BuildingPhotoForm({
  currentUrl,
  uploadAction,
  removeAction,
}: {
  currentUrl: string | null;
  uploadAction: (prevState: string | undefined, formData: FormData) => Promise<string>;
  removeAction: () => Promise<void>;
}) {
  const [message, formAction, pending] = useActionState(uploadAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="space-y-3">
      {currentUrl && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentUrl}
            alt="Building"
            className="h-24 w-24 rounded-md border border-gray-200 object-cover"
          />
          <form action={removeAction}>
            <button type="submit" className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50">
              Remove photo
            </button>
          </form>
        </div>
      )}

      <form
        ref={formRef}
        action={async (formData) => {
          await formAction(formData);
          formRef.current?.reset();
        }}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-gray-300 p-3"
      >
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            {currentUrl ? "Replace photo" : "Upload photo"}
          </label>
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
          {pending ? "Uploading..." : "Save photo"}
        </button>
        {message && <p className="w-full text-sm text-red-600">{message}</p>}
      </form>
    </div>
  );
}
