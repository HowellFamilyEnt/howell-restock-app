import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { updateItem, toggleItemActive } from "../actions";
import DeleteItemButton from "./DeleteItemButton";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/items" className="text-sm text-gray-500 hover:text-gray-900">
          ← Items
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">{item.name}</h1>
        <p className="text-sm text-gray-500">{item.active ? "Active" : "Inactive"}</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <form action={updateItem.bind(null, item.id)} className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Name</label>
            <input
              name="name"
              defaultValue={item.name}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Category</label>
            <input
              name="category"
              defaultValue={item.category}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Unit of measure</label>
            <input
              name="unit_of_measure"
              defaultValue={item.unit_of_measure}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Central stock qty</label>
            <input
              name="central_stock_qty"
              type="number"
              min={0}
              defaultValue={item.central_stock_qty}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Reorder threshold</label>
            <input
              name="reorder_threshold"
              type="number"
              min={0}
              defaultValue={item.reorder_threshold}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Reorder qty</label>
            <input
              name="reorder_qty"
              type="number"
              min={0}
              defaultValue={item.reorder_qty}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Preferred vendor</label>
            <input
              name="preferred_vendor"
              defaultValue={item.preferred_vendor ?? ""}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Unit cost ($)</label>
            <input
              name="unit_cost"
              type="number"
              step="0.01"
              min={0}
              defaultValue={item.unit_cost.toString()}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="col-span-2">
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            {item.active ? "Deactivate this item" : "Reactivate this item"}
          </h2>
          <p className="text-sm text-gray-500">
            {item.active
              ? "Hides it from the item catalog, restock logging, and par level lists without deleting its history."
              : "Makes it available again in the item catalog, restock logging, and par level lists."}
          </p>
        </div>
        <form action={toggleItemActive.bind(null, item.id, !item.active)}>
          <button
            type="submit"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            {item.active ? "Deactivate" : "Reactivate"}
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Delete permanently</h2>
        <p className="mb-3 text-sm text-gray-500">
          Only possible if this item has no restock history, par levels, or work order references —
          otherwise deactivate it instead to keep reporting data intact.
        </p>
        <DeleteItemButton itemId={item.id} />
      </div>
    </div>
  );
}
