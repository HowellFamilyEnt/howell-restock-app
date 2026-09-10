"use client";

import { updateWorkOrderDueDateAction } from "../actions";

export default function DueDateForm({
  workOrderId,
  currentDueDate,
}: {
  workOrderId: string;
  currentDueDate: string | null;
}) {
  const boundAction = updateWorkOrderDueDateAction.bind(null, workOrderId);

  return (
    <form action={boundAction} className="flex items-end gap-3">
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Due date</label>
        <input
          key={currentDueDate ?? "none"}
          name="due_date"
          type="date"
          defaultValue={currentDueDate ?? ""}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        Save
      </button>
    </form>
  );
}
