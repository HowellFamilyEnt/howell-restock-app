import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { createItem } from "./actions";
import { ROOM_GROUP_ORDER } from "@/lib/roomGroups";

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const { show } = await searchParams;
  const showInactive = show === "all";

  const items = await prisma.item.findMany({
    where: showInactive ? {} : { active: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Item catalog</h1>
          <p className="text-sm text-gray-500">{items.length} total</p>
        </div>
        <Link
          href={showInactive ? "/items" : "/items?show=all"}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          {showInactive ? "Hide inactive" : "Show inactive"}
        </Link>
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Item</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Room(s)</th>
              <th className="px-4 py-2">Unit</th>
              <th className="px-4 py-2">Central stock</th>
              <th className="px-4 py-2">Reorder threshold</th>
              <th className="px-4 py-2">Reorder qty</th>
              <th className="px-4 py-2">Vendor</th>
              <th className="px-4 py-2">Unit cost</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => {
              const low = item.central_stock_qty <= item.reorder_threshold;
              return (
                <tr key={item.id} className={item.active ? "" : "opacity-50"}>
                  <td className="px-4 py-2 font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-2 text-gray-600">{item.category}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {item.room_groups.length > 0 ? item.room_groups.join(", ") : "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{item.unit_of_measure}</td>
                  <td className={`px-4 py-2 ${low ? "font-semibold text-red-600" : "text-gray-600"}`}>
                    {item.central_stock_qty}
                    {low && " (low)"}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{item.reorder_threshold}</td>
                  <td className="px-4 py-2 text-gray-600">{item.reorder_qty}</td>
                  <td className="px-4 py-2 text-gray-600">{item.preferred_vendor ?? "—"}</td>
                  <td className="px-4 py-2 text-gray-600">${item.unit_cost.toString()}</td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/items/${item.id}`}
                      className="text-xs font-medium text-gray-600 hover:text-gray-900"
                    >
                      Edit →
                    </Link>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-gray-400">
                  No items yet — add one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {items.map((item) => {
          const low = item.central_stock_qty <= item.reorder_threshold;
          return (
            <Link
              key={item.id}
              href={`/items/${item.id}`}
              className={`block rounded-lg border border-gray-200 bg-white p-4 ${item.active ? "" : "opacity-50"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-gray-900">{item.name}</span>
                <span className={`shrink-0 text-sm font-semibold ${low ? "text-red-600" : "text-gray-500"}`}>
                  {item.central_stock_qty}
                  {low && " (low)"}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {item.category}
                {item.room_groups.length > 0 && ` · ${item.room_groups.join(", ")}`}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                <span>Unit: {item.unit_of_measure}</span>
                <span>
                  Reorder at {item.reorder_threshold}, +{item.reorder_qty}
                </span>
                {item.preferred_vendor && <span>Vendor: {item.preferred_vendor}</span>}
                <span>${item.unit_cost.toString()}</span>
              </div>
            </Link>
          );
        })}
        {items.length === 0 && (
          <p className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-gray-400">
            No items yet — add one below.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Add an item</h2>
        <form action={createItem} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Name</label>
            <input name="name" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Category</label>
            <input
              name="category"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Unit of measure</label>
            <input
              name="unit_of_measure"
              placeholder="e.g. roll, bottle, case"
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
              defaultValue={0}
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
              defaultValue={0}
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
              defaultValue={0}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Preferred vendor</label>
            <input
              name="preferred_vendor"
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
              defaultValue={0}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Room(s) — for grouping on property details & work orders
            </label>
            <div className="flex flex-wrap gap-3">
              {ROOM_GROUP_ORDER.map((room) => (
                <label key={room} className="flex items-center gap-1.5 text-sm text-gray-700">
                  <input type="checkbox" name="room_groups" value={room} />
                  {room}
                </label>
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Add item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
