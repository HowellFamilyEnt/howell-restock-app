import { prisma } from "@/lib/prisma";
import { logRestock } from "./actions";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export default async function RestockPage() {
  const [properties, items, recentEvents] = await Promise.all([
    prisma.property.findMany({ where: { active: true }, orderBy: { name_address: "asc" } }),
    prisma.item.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.restockEvent.findMany({
      orderBy: { date: "desc" },
      take: 20,
      include: { property: true, item: true, loggedByUser: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Log a restock</h1>
        <p className="text-sm text-gray-500">Record what was actually delivered on a visit.</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <form action={logRestock} className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Property</label>
            <select
              name="property_id"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name_address}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Item</label>
            <select
              name="item_id"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Date</label>
            <input
              name="date"
              type="date"
              defaultValue={todayIsoDate()}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Qty delivered</label>
            <input
              name="qty_delivered"
              type="number"
              min={1}
              defaultValue={1}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <textarea
              name="notes"
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input id="urgent_flag" name="urgent_flag" type="checkbox" className="h-4 w-4" />
            <label htmlFor="urgent_flag" className="text-sm text-gray-700">
              This was an urgent / early visit
            </label>
          </div>
          <div className="col-span-2">
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Log restock
            </button>
          </div>
        </form>
        {properties.length === 0 && (
          <p className="mt-3 text-sm text-amber-600">Add a property first.</p>
        )}
        {items.length === 0 && (
          <p className="mt-3 text-sm text-amber-600">Add an item first.</p>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Recent restock events</h2>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Property</th>
                <th className="px-4 py-2">Item</th>
                <th className="px-4 py-2">Qty</th>
                <th className="px-4 py-2">Urgent</th>
                <th className="px-4 py-2">Logged by</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentEvents.map((event) => (
                <tr key={event.id}>
                  <td className="px-4 py-2 text-gray-600">{event.date.toISOString().slice(0, 10)}</td>
                  <td className="px-4 py-2 text-gray-900">{event.property.name_address}</td>
                  <td className="px-4 py-2 text-gray-600">{event.item.name}</td>
                  <td className="px-4 py-2 text-gray-600">{event.qty_delivered}</td>
                  <td className="px-4 py-2 text-gray-600">{event.urgent_flag ? "Yes" : ""}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {event.loggedByUser?.name ?? event.logged_by_name ?? "—"}
                  </td>
                </tr>
              ))}
              {recentEvents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                    No restock events logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
