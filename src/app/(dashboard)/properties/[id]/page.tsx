import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  setParLevel,
  updatePropertyDetails,
  updateMasterDoorCode,
  updateGeneralNotes,
  updateAssignedTeamMember,
  updateLicenseInfo,
  updateSmartLock,
  toggleGuestAutomationForProperty,
  issueVendorAccessCode,
  createWorkOrderAction,
} from "./actions";
import { togglePropertyActive } from "../actions";
import { groupByRoom } from "@/lib/roomGroups";
import { computeLicenseStatus } from "@/lib/licenses";
import { getSeamApiKey } from "@/lib/settings";
import { listSeamLocks } from "@/lib/seam";
import DeletePropertyButton from "./DeletePropertyButton";
import VendorAccessCodeForm from "./VendorAccessCodeForm";

const licenseStatusStyles: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  ExpiringSoon: "bg-amber-100 text-amber-700",
  Expired: "bg-red-100 text-red-700",
  NotSet: "bg-gray-100 text-gray-500",
};

const licenseStatusLabels: Record<string, string> = {
  Active: "Active",
  ExpiringSoon: "Expiring soon",
  Expired: "Expired",
  NotSet: "Not set",
};

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id },
    include: { parLevels: true },
  });

  if (!property) notFound();

  const [items, teamMembers, workOrders] = await Promise.all([
    prisma.item.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.teamMember.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.workOrder.findMany({
      where: { property_id: property.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { assignedTeamMember: true },
    }),
  ]);
  const parByItemId = new Map(property.parLevels.map((p) => [p.item_id, p.target_qty]));
  const itemsByRoom = groupByRoom(items, (item) => item.room_groups);
  const licenseStatus = computeLicenseStatus(property.license_expiration_date);

  const seamApiKey = await getSeamApiKey();
  const seamLocks = seamApiKey ? await listSeamLocks(seamApiKey).catch(() => []) : [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/properties" className="text-sm text-gray-500 hover:text-gray-900">
          ← Properties
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">{property.name_address}</h1>
        <p className="text-sm text-gray-500">
          {property.type} · {property.unit_count} unit{property.unit_count === 1 ? "" : "s"} · cadence{" "}
          {property.restock_frequency_days}d
        </p>
        {property.address && <p className="text-sm text-gray-500">{property.address}</p>}
        {(property.bedrooms !== null || property.bathrooms !== null) && (
          <p className="text-sm text-gray-500">
            {property.bedrooms ?? "—"} bed / {property.bathrooms ?? "—"} bath
          </p>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Address & bed/bath</h2>
        <form
          action={updatePropertyDetails.bind(null, property.id)}
          className="grid grid-cols-3 gap-4"
        >
          <div className="col-span-3 space-y-1">
            <label className="text-sm font-medium text-gray-700">Street address</label>
            <input
              name="address"
              defaultValue={property.address ?? ""}
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
              defaultValue={property.bedrooms ?? ""}
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
              defaultValue={property.bathrooms ?? ""}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Save
            </button>
          </div>
        </form>
        {property.source === "Hostaway" && (
          <p className="mt-3 text-xs text-gray-400">
            This property syncs from Hostaway — address/bed/bath will be overwritten by its listing
            data on the next sync. Door code and notes below are yours and won&apos;t be touched.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Master door code</h2>
        <form
          action={updateMasterDoorCode.bind(null, property.id)}
          className="flex items-end gap-3"
        >
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium text-gray-700">Code</label>
            <input
              name="master_door_code"
              defaultValue={property.master_door_code ?? ""}
              placeholder="e.g. 1234#"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Save
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="mb-1 text-sm font-semibold text-gray-900">Guest automation</h2>
            <p className="text-sm text-gray-500">
              Direct booking confirmations and smart-access codes for this property — also gated by the
              master switch on the Settings page.
            </p>
          </div>
          <form action={toggleGuestAutomationForProperty.bind(null, property.id, !property.guest_automation_enabled)}>
            <button
              type="submit"
              className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium ${
                property.guest_automation_enabled
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  : "border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {property.guest_automation_enabled ? "On for this property" : "Off for this property"}
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Smart lock</h2>
        <p className="mb-4 text-sm text-gray-500">
          Pilot Seam-backed door codes on this property. Not connected means guests keep using the
          master door code above.
        </p>
        {!seamApiKey ? (
          <p className="text-sm text-gray-400">Add a Seam API key on the Settings page first.</p>
        ) : (
          <form action={updateSmartLock.bind(null, property.id)} className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium text-gray-700">Device</label>
              <select
                name="smart_lock_id"
                defaultValue={property.smart_lock_id ?? ""}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Not connected</option>
                {seamLocks.map((lock) => (
                  <option key={lock.device_id} value={lock.device_id}>
                    {lock.display_name} {lock.properties?.online === false ? "(offline)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Save
            </button>
          </form>
        )}
      </div>

      {property.smart_lock_id && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-1 text-sm font-semibold text-gray-900">Issue vendor access code</h2>
          <p className="mb-4 text-sm text-gray-500">
            A one-off code for a 3rd-party vendor (HVAC, etc.) — not the cleaning crew, who already have
            their own access. Times are in this property&apos;s local timezone
            {property.timezone ? ` (${property.timezone})` : " (not set — treated as UTC)"}.
          </p>
          <VendorAccessCodeForm action={issueVendorAccessCode.bind(null, property.id)} />
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Notes</h2>
        <form action={updateGeneralNotes.bind(null, property.id)} className="space-y-3">
          <textarea
            name="general_notes"
            rows={4}
            defaultValue={property.general_notes ?? ""}
            placeholder="Anything the crew or office should know about this property..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Save
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-900">Short-term rental license</h2>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${licenseStatusStyles[licenseStatus]}`}>
            {licenseStatusLabels[licenseStatus]}
          </span>
        </div>
        <form
          action={updateLicenseInfo.bind(null, property.id)}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Owner</label>
            <input
              name="license_owner"
              defaultValue={property.license_owner ?? ""}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">License number</label>
            <input
              name="license_number"
              defaultValue={property.license_number ?? ""}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">License type</label>
            <input
              name="license_type"
              placeholder="e.g. STR Permit"
              defaultValue={property.license_type ?? ""}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Issue date</label>
            <input
              name="license_issue_date"
              type="date"
              defaultValue={property.license_issue_date?.toISOString().slice(0, 10) ?? ""}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Expiration date</label>
            <input
              name="license_expiration_date"
              type="date"
              defaultValue={property.license_expiration_date?.toISOString().slice(0, 10) ?? ""}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Assigned team member</h2>
        <form
          action={updateAssignedTeamMember.bind(null, property.id)}
          className="flex items-end gap-3"
        >
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium text-gray-700">Team member</label>
            <select
              name="assignedTeamMemberId"
              defaultValue={property.assignedTeamMemberId ?? ""}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Unassigned</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Save
          </button>
        </form>
        <p className="mt-3 text-xs text-gray-400">
          Work order links for this property go to whoever is assigned here. Manage people on the{" "}
          <Link href="/team" className="underline">
            Team
          </Link>{" "}
          page.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Work orders</h2>
          <form action={createWorkOrderAction.bind(null, property.id)} className="flex items-end gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Due date (optional)</label>
              <input
                name="due_date"
                type="date"
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
            >
              Create work order
            </button>
          </form>
        </div>
        {workOrders.length === 0 ? (
          <p className="text-sm text-gray-400">No work orders yet for this property.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {workOrders.map((wo) => (
              <li key={wo.id} className="flex items-center justify-between">
                <span className="text-gray-600">
                  {wo.scheduled_for
                    ? `Due ${wo.scheduled_for.toISOString().slice(0, 10)}`
                    : `Created ${wo.createdAt.toISOString().slice(0, 10)}`}{" "}
                  · {wo.assignedTeamMember?.name ?? "Unassigned"} ·{" "}
                  <span className={wo.status === "Completed" ? "text-green-600" : "text-amber-600"}>
                    {wo.status}
                  </span>
                </span>
                <Link href={`/work-orders/${wo.id}`} className="font-medium text-gray-600 hover:underline">
                  View →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
          No items in the catalog yet — add some on the Items page first.
        </div>
      ) : (
        itemsByRoom.map((section) => (
          <div key={section.label} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <h2 className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-900">
              {section.label}
            </h2>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Item</th>
                  <th className="px-4 py-2">Unit</th>
                  <th className="px-4 py-2">Par (target qty)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {section.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2 font-medium text-gray-900">{item.name}</td>
                    <td className="px-4 py-2 text-gray-600">{item.unit_of_measure}</td>
                    <td className="px-4 py-2">
                      <form
                        action={setParLevel.bind(null, property.id, item.id)}
                        className="flex items-center gap-2"
                      >
                        <input
                          name="target_qty"
                          type="number"
                          min={0}
                          defaultValue={parByItemId.get(item.id) ?? 0}
                          className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                        />
                        <button
                          type="submit"
                          className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                        >
                          Save
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            {property.active ? "Archive this property" : "Restore this property"}
          </h2>
          <p className="text-sm text-gray-500">
            {property.active
              ? "Hides it from the Properties page by default and stops it from generating new work orders, without deleting its history. Safe for a property still in Hostaway that you no longer manage — archiving survives a future Hostaway sync."
              : "Makes it active again — visible on the Properties page and eligible for new work orders."}
          </p>
        </div>
        <form action={togglePropertyActive.bind(null, property.id, !property.active)}>
          <button
            type="submit"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            {property.active ? "Archive" : "Restore"}
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Delete permanently</h2>
        <p className="mb-3 text-sm text-gray-500">
          Only possible if this property has no restock history, notes, or work orders — otherwise
          archive it instead to keep that history intact. If this property still exists in Hostaway,
          deleting it here won&apos;t stick if Sync from Hostaway runs again — archive it instead.
        </p>
        <DeletePropertyButton propertyId={property.id} />
      </div>
    </div>
  );
}
