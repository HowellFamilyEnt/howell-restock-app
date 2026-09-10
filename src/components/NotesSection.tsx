"use client";

import { useActionState, useRef } from "react";

type NoteWithPhotos = {
  id: string;
  category: string;
  description: string;
  status: string;
  createdAt: string;
  photos: { id: string; url: string }[];
};

const categoryStyles: Record<string, string> = {
  RestockIssue: "bg-amber-100 text-amber-700",
  Repair: "bg-red-100 text-red-700",
  General: "bg-gray-100 text-gray-700",
};

const categoryLabels: Record<string, string> = {
  RestockIssue: "Restock Issue",
  Repair: "Repair",
  General: "General",
};

export default function NotesSection({
  notes,
  action,
}: {
  notes: NoteWithPhotos[];
  action: (prevState: string | undefined, formData: FormData) => Promise<string>;
}) {
  const [message, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="space-y-4">
      {notes.length > 0 && (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="rounded-lg border border-gray-200 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${categoryStyles[note.category] ?? categoryStyles.General}`}
                >
                  {categoryLabels[note.category] ?? note.category}
                </span>
                <span className="text-xs text-gray-400">{note.createdAt}</span>
              </div>
              <p className="text-sm text-gray-700">{note.description}</p>
              {note.photos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {note.photos.map((photo) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={photo.url}
                        alt="Attached to note"
                        className="h-20 w-20 rounded-md border border-gray-200 object-cover"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <form
        ref={formRef}
        action={async (formData) => {
          await formAction(formData);
          formRef.current?.reset();
        }}
        className="space-y-3 rounded-lg border border-dashed border-gray-300 p-4"
      >
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Category</label>
          <select
            name="category"
            defaultValue="RestockIssue"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="RestockIssue">Restock Issue</option>
            <option value="Repair">Repair</option>
            <option value="General">General</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">What did you notice?</label>
          <textarea
            name="description"
            rows={3}
            required
            placeholder="e.g. dishwasher not draining, ran out of shelf space for towels..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Photos (optional)</label>
          <input
            name="photos"
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="w-full text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {pending ? "Saving..." : "Add note"}
        </button>
        {message && <p className="text-sm text-gray-500">{message}</p>}
      </form>
    </div>
  );
}
