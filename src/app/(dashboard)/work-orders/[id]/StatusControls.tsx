"use client";

import { useTransition } from "react";
import {
  setWorkOrderStatusAction,
  deleteWorkOrderAction,
} from "../actions";

export default function StatusControls({
  workOrderId,
  status,
}: {
  workOrderId: string;
  status: "Open" | "Completed" | "Archived";
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "Open" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => setWorkOrderStatusAction(workOrderId, "Open"))}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Reopen
        </button>
      )}
      {status !== "Archived" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => setWorkOrderStatusAction(workOrderId, "Archived"))}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Archive
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Delete this work order? Its completed restock history stays intact, but the task itself can't be recovered.")) {
            return;
          }
          startTransition(() => deleteWorkOrderAction(workOrderId));
        }}
        className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
