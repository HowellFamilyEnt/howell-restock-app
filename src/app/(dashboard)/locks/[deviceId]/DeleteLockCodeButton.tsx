"use client";

import { useActionState } from "react";
import { deleteLockAccessCode } from "./actions";

export default function DeleteLockCodeButton({ accessCodeId }: { accessCodeId: string }) {
  const boundAction = deleteLockAccessCode.bind(null, accessCodeId);
  const [message, formAction, pending] = useActionState(boundAction, undefined);

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <button
        type="submit"
        disabled={pending}
        className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
      >
        {pending ? "Removing..." : "Remove"}
      </button>
      {message && <span className="text-xs text-red-600">{message}</span>}
    </form>
  );
}
