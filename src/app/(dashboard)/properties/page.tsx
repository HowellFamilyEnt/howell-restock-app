import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { createProperty, toggleUrgent, togglePropertyActive } from "./actions";
import HostawaySyncButton from "./HostawaySyncButton";

export default async function PropertiesPage() {
  const properties = await prisma.property.findMany({
    orderBy: { name_address: "asc" },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Properties</h1>
          <p className="text-sm text-gray-500">{properties.length} total</p>
        </div>
        <HostawaySyncButton />
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Property</th>
              <th className="px-4 py-2">Address</th>
              <th className="px-4 py-2">Beds/Baths</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Units</th>
              <th className="px-4 py-2">Crew</th>
              <th className="px-4 py-2">Cadence (days)</th>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Urgent</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {properties.map((property) => (
              <tr key={property.id} className={property.active ? "" : "opacity-50"}>
                <td className="px-4 py-2 font-medium text-gray-900">
                  <Link href={`/properties/${property.id}`} className="hover:underline">
                    {property.name_address}
                  </Link>
                </td>
                <td className="max-w-[16rem] truncate px-4 py-2 text-gray-600" title={property.address ?? ""}>
                  {property.address ?? "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-gray-600">
                  {property.bedrooms ?? "—"}bd / {property.bathrooms ?? "—"}ba
                </td>
                <td className="px-4 py-2 text-gray-600">{property.type}</td>
                <td className="px-4 py-2 text-gray-600">{property.unit_count}</td>
                <td className="px-4 py-2 text-gray-600">{property.assigned_cleaning_team ?? "—"}</td>
                <td className="px-4 py-2 text-gray-600">{property.restock_frequency_days}</td>
                <td className="px-4 py-2 text-gray-600">{property.source}</td>
                <td className="px-4 py-2">
                  <form action={toggleUrgent.bind(null, property.id, !property.urgent_restock_requested)}>
                    <button
                      type="submit"
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        property.urgent_restock_requested
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {property.urgent_restock_requested ? "URGENT" : "—"}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-2">
                  <form action={togglePropertyActive.bind(null, property.id, !property.active)}>
                    <button type="submit" className="text-xs text-gray-500 hover:text-gray-900">
                      {property.active ? "Active" : "Inactive"}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/properties/${property.id}`}
                    className="text-xs font-medium text-gray-600 hover:text-gray-900"
                  >
                    Par levels →
                  </Link>
                </td>
              </tr>
            ))}
            {properties.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-6 text-center text-gray-400">
                  No properties yet — add one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Add a property</h2>
        <form action={createProperty} className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1">
            <label className="text-sm font-medium text-gray-700">Name / address</label>
            <input
              name="name_address"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-sm font-medium text-gray-700">Street address</label>
            <input
              name="address"
              placeholder="e.g. 123 Main St, Oklahoma City, OK 73102"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Bedrooms</label>
            <input
              name="bedrooms"
              type="number"
              min={0}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Bathrooms</label>
            <input
              name="bathrooms"
              type="number"
              min={0}
              step="0.5"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Type</label>
            <select
              name="type"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              defaultValue="STR"
            >
              <option value="STR">STR</option>
              <option value="LTR">LTR</option>
              <option value="HUD_VASH">HUD-VASH</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Unit count</label>
            <input
              name="unit_count"
              type="number"
              min={1}
              defaultValue={1}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Assigned cleaning team</label>
            <input
              name="assigned_cleaning_team"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Restock cadence (days)</label>
            <input
              name="restock_frequency_days"
              type="number"
              min={1}
              defaultValue={30}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="col-span-2">
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Add property
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
