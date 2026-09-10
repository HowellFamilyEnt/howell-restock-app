import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  setParLevel,
  updatePropertyDetails,
  updateMasterDoorCode,
  updateGeneralNotes,
  updateAssignedTeamMember,
  createWorkOrderAction,
} from "./actions";

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

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Item</th>
              <th className="px-4 py-2">Unit</th>
              <th className="px-4 py-2">Par (target qty)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
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
            {items.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                  No items in the catalog yet — add some on the Items page first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
