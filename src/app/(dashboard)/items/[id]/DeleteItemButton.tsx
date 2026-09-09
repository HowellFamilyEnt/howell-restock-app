"use client";

import { useActionState } from "react";
import { deleteItem } from "../actions";

export default function DeleteItemButton({ itemId }: { itemId: string }) {
  const boundAction = deleteItem.bind(null, itemId);
  const [message, formAction, pending] = useActionState(boundAction, undefined);

  return (
    <form action={formAction} className="flex items-center gap-3">
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        Delete permanently
      </button>
      {message && <p className="text-sm text-gray-500">{message}</p>}
    </form>
  );
}
