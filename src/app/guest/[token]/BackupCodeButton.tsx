"use client";

import { useActionState } from "react";
import { requestBackupCode } from "./actions";

export default function BackupCodeButton({ token }: { token: string }) {
  const boundAction = requestBackupCode.bind(null, token);
  const [message, formAction, pending] = useActionState(async () => boundAction(), undefined);

  return (
    <form action={formAction} className="mt-2">
      <button
        type="submit"
        disabled={pending}
        className="text-sm font-medium text-gray-600 underline hover:text-gray-900 disabled:opacity-50"
      >
        {pending ? "Requesting..." : "My code isn't working"}
      </button>
      {message && <p className="mt-1 text-sm text-gray-500">{message}</p>}
    </form>
  );
}
