"use client";

import { useActionState } from "react";
import { deleteSeamLock } from "./actions";

export default function DeleteLockButton({ id }: { id: string }) {
  const boundAction = deleteSeamLock.bind(null, id);
  const [message, formAction, pending] = useActionState(boundAction, undefined);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <button
        type="submit"
        disabled={pending}
        className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
      >
        Delete
      </button>
      {message && <span className="text-xs text-gray-500">{message}</span>}
    </form>
  );
}
