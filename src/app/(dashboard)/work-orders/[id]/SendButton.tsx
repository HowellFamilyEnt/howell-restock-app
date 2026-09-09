"use client";

import { useActionState } from "react";
import { sendWorkOrderNowAction } from "../actions";

export default function SendButton({ workOrderId }: { workOrderId: string }) {
  const boundAction = sendWorkOrderNowAction.bind(null, workOrderId);
  const [message, formAction, pending] = useActionState(boundAction, undefined);

  return (
    <form action={formAction} className="flex items-center gap-3">
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {pending ? "Sending..." : "Send link now"}
      </button>
      {message && <p className="text-sm text-gray-500">{message}</p>}
    </form>
  );
}
