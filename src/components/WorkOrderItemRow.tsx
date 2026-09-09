"use client";

import { useFormStatus } from "react-dom";

type Item = {
  id: string;
  name: string;
  unit_of_measure: string;
  qty_needed: number;
  qty_on_site: number | null;
  qty_added: number | null;
  completed: boolean;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
    >
      {pending ? "Saving..." : "Mark completed"}
    </button>
  );
}

export default function WorkOrderItemRow({
  item,
  action,
}: {
  item: Item;
  action: (formData: FormData) => Promise<void>;
}) {
  if (item.completed) {
    return (
      <tr className="bg-green-50">
        <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
        <td className="px-4 py-3 text-gray-600">{item.unit_of_measure}</td>
        <td className="px-4 py-3 text-gray-600">{item.qty_needed}</td>
        <td className="px-4 py-3 text-gray-600">{item.qty_on_site ?? "—"}</td>
        <td className="px-4 py-3 text-gray-600">{item.qty_added ?? "—"}</td>
        <td className="px-4 py-3 text-sm font-medium text-green-700">✓ Completed</td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
      <td className="px-4 py-3 text-gray-600">{item.unit_of_measure}</td>
      <td className="px-4 py-3 text-gray-600">{item.qty_needed}</td>
      <td className="px-4 py-3" colSpan={3}>
        <form action={action} className="flex flex-wrap items-center gap-2">
          <input
            name="qty_on_site"
            type="number"
            min={0}
            placeholder="Qty on site"
            className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
          <input
            name="qty_added"
            type="number"
            min={0}
            placeholder="Qty added"
            className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
          <SubmitButton />
        </form>
      </td>
    </tr>
  );
}
