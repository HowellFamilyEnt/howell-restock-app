import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { createProperty, togglePropertyActive, updateArea } from "./actions";
import HostawaySyncButton from "./HostawaySyncButton";
import CreatableGroupSelect from "@/components/CreatableGroupSelect";
import PropertyStatusBadge from "./PropertyStatusBadge";
import { activeCleaningStatuses, type CleaningStatus } from "@/lib/cleaningStatus";

const CLEANING_STATUS_STYLES: Record<CleaningStatus, string> = {
  not_ready: "bg-red-100 text-red-700",
  ready: "bg-green-100 text-green-700",
  occupied: "bg-gray-200 text-gray-600",
};

const CLEANING_STATUS_LABELS: Record<CleaningStatus, string> = {
  not_ready: "Not ready",
  ready: "Ready",
  occupied: "Occupied",
};

const AREA_UNASSIGNED = "No area set";

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const { show } = await searchParams;
  const showInactive = show === "all";

  const properties = await prisma.property.findMany({
    where: showInactive ? {} : { active: true },
    orderBy: { name_address: "asc" },
  });

  const allAreas = Array.from(
    new Set(properties.map((p) => p.area).filter((a): a is string => !!a))
  ).sort((a, b) => a.localeCompare(b));

  const groups = new Map<string, typeof properties>();
  for (const property of properties) {
    const key = property.area?.trim() || AREA_UNASSIGNED;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(property);
  }
  const groupKeys = Array.from(groups.keys()).sort((a, b) => {
    if (a === AREA_UNASSIGNED) return 1;
    if (b === AREA_UNASSIGNED) return -1;
    return a.localeCompare(b);
  });

  const cleaningStatuses = await activeCleaningStatuses();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Properties</h1>
          <p className="text-sm text-gray-500">{properties.length} total</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={showInactive ? "/properties" : "/properties?show=all"}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            {showInactive ? "Hide archived" : "Show archived"}
          </Link>
          <HostawaySyncButton />
        </div>
      </div>

      {groupKeys.length === 0 && (
        <p className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-gray-400">
          No properties yet — add one below.
        </p>
      )}

      {groupKeys.map((area) => {
        const groupProperties = groups.get(area)!;
        return (
          <details key={area} open className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <summary className="cursor-pointer border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-900">
              {area} <span className="font-normal text-gray-400">({groupProperties.length})</span>
            </summary>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-2">Property</th>
                    <th className="px-4 py-2">Address</th>
                    <th className="px-4 py-2">Beds/Baths</th>
                    <th className="px-4 py-2">Area</th>
                    <th className="px-4 py-2">Cleaning</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {groupProperties.map((property) => (
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
                      <td className="px-4 py-2">
                        <form
                          action={updateArea.bind(null, property.id)}
                          className="flex items-center gap-1"
                        >
                          <CreatableGroupSelect
                            name="area"
                            options={allAreas}
                            defaultValue={property.area ?? ""}
                            noneLabel="No area"
                            newLabel="+ New area..."
                            newPlaceholder="New area name"
                          />
                          <button
                            type="submit"
                            className="shrink-0 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                          >
                            Save
                          </button>
                        </form>
                      </td>
                      <td className="px-4 py-2">
                        {(() => {
                          const status = cleaningStatuses.get(property.id) ?? "ready";
                          return (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${CLEANING_STATUS_STYLES[status]}`}
                            >
                              {CLEANING_STATUS_LABELS[status]}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-2">
                        <PropertyStatusBadge
                          propertyName={property.name_address}
                          isHostaway={property.source === "Hostaway"}
                          airbnbStatus={property.airbnb_status}
                          isActive={property.active}
                          toggleActiveAction={togglePropertyActive.bind(null, property.id, !property.active)}
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Link
                          href={`/properties/${property.id}`}
                          className="text-xs font-medium text-gray-600 hover:text-gray-900"
                        >
                          Details →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 md:hidden">
              {groupProperties.map((property) => (
                <div
                  key={property.id}
                  className={`rounded-lg border border-gray-200 bg-white p-4 ${property.active ? "" : "opacity-50"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/properties/${property.id}`} className="font-medium text-gray-900 hover:underline">
                      {property.name_address}
                    </Link>
                    <PropertyStatusBadge
                      propertyName={property.name_address}
                      isHostaway={property.source === "Hostaway"}
                      airbnbStatus={property.airbnb_status}
                      isActive={property.active}
                      toggleActiveAction={togglePropertyActive.bind(null, property.id, !property.active)}
                    />
                  </div>
                  {property.address && <p className="mt-1 text-sm text-gray-500">{property.address}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                    <span>
                      {property.bedrooms ?? "—"}bd / {property.bathrooms ?? "—"}ba
                    </span>
                    {(() => {
                      const status = cleaningStatuses.get(property.id) ?? "ready";
                      return (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${CLEANING_STATUS_STYLES[status]}`}
                        >
                          {CLEANING_STATUS_LABELS[status]}
                        </span>
                      );
                    })()}
                  </div>
                  <form
                    action={updateArea.bind(null, property.id)}
                    className="mt-2 flex items-center gap-1"
                  >
                    <CreatableGroupSelect
                      name="area"
                      options={allAreas}
                      defaultValue={property.area ?? ""}
                      noneLabel="No area"
                      newLabel="+ New area..."
                      newPlaceholder="New area name"
                    />
                    <button
                      type="submit"
                      className="shrink-0 rounded-md bg-gray-100 px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                    >
                      Save
                    </button>
                  </form>
                  <div className="mt-3 flex items-center justify-end">
                    <Link
                      href={`/properties/${property.id}`}
                      className="text-xs font-medium text-gray-600 hover:text-gray-900"
                    >
                      Details →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </details>
        );
      })}

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Add a property</h2>
        <form action={createProperty} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
