"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  bulkArchiveWorkOrdersAction,
  bulkDeleteWorkOrdersAction,
  bulkSendWorkOrdersAction,
} from "./actions";

type Row = {
  id: string;
  propertyName: string;
  assignedToName: string;
  dueDate: string | null;
  created: string;
  sentAt: string | null;
  completedCount: number;
  totalCount: number;
  status: "Open" | "Completed" | "Archived";
};

const statusStyles: Record<string, string> = {
  Open: "bg-amber-100 text-amber-700",
  Completed: "bg-green-100 text-green-700",
  Archived: "bg-gray-200 text-gray-600",
};

export default function WorkOrdersTable({ rows }: { rows: Row[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function runBulk(action: (ids: string[]) => Promise<string | void>) {
    const ids = Array.from(selected);
    startTransition(async () => {
      const result = await action(ids);
      setMessage(typeof result === "string" ? result : `Done — ${ids.length} updated.`);
      setSelected(new Set());
    });
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2">
          <span className="text-sm text-gray-700">{selected.size} selected</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => runBulk(bulkSendWorkOrdersAction)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Send selected
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => runBulk(bulkArchiveWorkOrdersAction)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Archive selected
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(`Delete ${selected.size} work order(s)? This can't be undone.`)) return;
              runBulk(bulkDeleteWorkOrdersAction);
            }}
            className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Delete selected
          </button>
        </div>
      )}
      {message && <p className="text-sm text-gray-500">{message}</p>}

      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              </th>
              <th className="px-4 py-2">Property</th>
              <th className="px-4 py-2">Due</th>
              <th className="px-4 py-2">Assigned to</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2">Sent</th>
              <th className="px-4 py-2">Progress</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggleOne(row.id)}
                  />
                </td>
                <td className="px-4 py-2 font-medium text-gray-900">{row.propertyName}</td>
                <td className="px-4 py-2 text-gray-600">{row.dueDate ?? "—"}</td>
                <td className="px-4 py-2 text-gray-600">{row.assignedToName}</td>
                <td className="px-4 py-2 text-gray-600">{row.created}</td>
                <td className="px-4 py-2 text-gray-600">{row.sentAt ?? "No"}</td>
                <td className="px-4 py-2 text-gray-600">
                  {row.completedCount}/{row.totalCount}
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[row.status]}`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/work-orders/${row.id}`} className="text-xs font-medium text-gray-600 hover:text-gray-900">
                    View →
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-gray-400">
                  No work orders in this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.length > 0 && (
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs font-medium text-gray-600 hover:text-gray-900"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        )}
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={selected.has(row.id)}
                  onChange={() => toggleOne(row.id)}
                  className="mt-1"
                />
                <span className="font-medium text-gray-900">{row.propertyName}</span>
              </label>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[row.status]}`}
              >
                {row.status}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
              <span>Due: {row.dueDate ?? "—"}</span>
              <span>Assigned: {row.assignedToName}</span>
              <span>
                {row.completedCount}/{row.totalCount} done
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              <span>Created {row.created}</span>
              <span>Sent {row.sentAt ?? "No"}</span>
            </div>
            <Link
              href={`/work-orders/${row.id}`}
              className="mt-3 inline-block text-xs font-medium text-gray-600 hover:text-gray-900"
            >
              View →
            </Link>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-gray-400">
            No work orders in this view.
          </p>
        )}
      </div>
    </div>
  );
}
