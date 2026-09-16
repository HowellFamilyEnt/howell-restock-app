import { prisma } from "@/lib/prisma";
import ResyncButton from "./ResyncButton";
import { assignLock } from "./actions";

const BATTERY_STYLES: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  low: "bg-amber-100 text-amber-700",
  good: "bg-green-100 text-green-700",
  full: "bg-green-100 text-green-700",
};

function BatteryBadge({ level, status }: { level: number | null; status: string | null }) {
  if (level === null) return <span className="text-xs text-gray-400">—</span>;
  const pct = Math.round(level * 100);
  const style = (status && BATTERY_STYLES[status]) || "bg-gray-100 text-gray-600";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>{pct}%</span>;
}

function OnlineBadge({ online }: { online: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        online ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
      }`}
    >
      {online ? "Online" : "Offline"}
    </span>
  );
}

// Admin page for the Seam device list, cached locally in SeamLock
// (src/lib/seamSync.ts) and refreshed on demand rather than on every
// load - grouped by manufacturer, with wifi/battery status and property
// assignment (still stored on Property.smart_lock_id) side by side.
export default async function LocksPage() {
  const [locks, properties] = await Promise.all([
    prisma.seamLock.findMany({ orderBy: [{ manufacturer: "asc" }, { display_name: "asc" }] }),
    prisma.property.findMany({
      where: { active: true },
      select: { id: true, name_address: true, smart_lock_id: true },
      orderBy: { name_address: "asc" },
    }),
  ]);

  const propertyByDeviceId = new Map(
    properties.filter((p) => p.smart_lock_id).map((p) => [p.smart_lock_id as string, p])
  );

  const groups = new Map<string, typeof locks>();
  for (const lock of locks) {
    const key = lock.manufacturer ?? "Unknown brand";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(lock);
  }
  const groupKeys = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Locks</h1>
          <p className="text-sm text-gray-500">
            {locks.length} synced from Seam
            {locks[0] ? ` · last resync ${locks[0].lastSyncedAt.toISOString().slice(0, 16).replace("T", " ")}` : ""}
          </p>
        </div>
        <ResyncButton />
      </div>

      {locks.length === 0 && (
        <p className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-gray-400">
          No locks yet — connect a lock vendor account in Seam, then hit Resync from Seam.
        </p>
      )}

      {groupKeys.map((manufacturer) => {
        const groupLocks = groups.get(manufacturer)!;
        return (
          <div key={manufacturer} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <h2 className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-900">
              {manufacturer} <span className="font-normal text-gray-400">({groupLocks.length})</span>
            </h2>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-2">Device</th>
                    <th className="px-4 py-2">Wifi</th>
                    <th className="px-4 py-2">Battery</th>
                    <th className="px-4 py-2">Assigned property</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {groupLocks.map((lock) => {
                    const assigned = propertyByDeviceId.get(lock.device_id);
                    return (
                      <tr key={lock.id}>
                        <td className="px-4 py-2 font-medium text-gray-900">{lock.display_name}</td>
                        <td className="px-4 py-2">
                          <OnlineBadge online={lock.online} />
                        </td>
                        <td className="px-4 py-2">
                          <BatteryBadge level={lock.battery_level} status={lock.battery_status} />
                        </td>
                        <td colSpan={2} className="px-4 py-2">
                          <form action={assignLock.bind(null, lock.device_id)} className="flex items-center gap-2">
                            <select
                              name="property_id"
                              defaultValue={assigned?.id ?? ""}
                              className="w-full min-w-[10rem] flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                            >
                              <option value="">Unassigned</option>
                              {properties.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name_address}
                                </option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              className="shrink-0 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                            >
                              Save
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 md:hidden">
              {groupLocks.map((lock) => {
                const assigned = propertyByDeviceId.get(lock.device_id);
                return (
                  <div key={lock.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-gray-900">{lock.display_name}</span>
                      <div className="flex shrink-0 gap-1">
                        <OnlineBadge online={lock.online} />
                        <BatteryBadge level={lock.battery_level} status={lock.battery_status} />
                      </div>
                    </div>
                    <form action={assignLock.bind(null, lock.device_id)} className="mt-2 flex items-center gap-2">
                      <select
                        name="property_id"
                        defaultValue={assigned?.id ?? ""}
                        className="w-full min-w-[10rem] flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      >
                        <option value="">Unassigned</option>
                        {properties.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name_address}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="shrink-0 rounded-md bg-gray-100 px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                      >
                        Save
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
