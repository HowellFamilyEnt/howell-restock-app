"use client";

import { useActionState } from "react";
import { pullBackupCode } from "./actions";

export default function PullBackupCodeButton({ id }: { id: string }) {
  const boundAction = pullBackupCode.bind(null, id);
  const [message, formAction, pending] = useActionState(boundAction, undefined);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {pending ? "Pulling..." : "Pull backup code"}
      </button>
      {message && <span className="text-xs text-gray-500">{message}</span>}
    </form>
  );
}
