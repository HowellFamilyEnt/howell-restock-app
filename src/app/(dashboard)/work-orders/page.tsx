import { prisma } from "@/lib/prisma";
import Link from "next/link";
import SweepButton from "./SweepButton";
import { createWorkOrderForPropertyAction } from "./actions";

export default async function WorkOrdersPage() {
  const [workOrders, properties] = await Promise.all([
    prisma.workOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { property: true, assignedTeamMember: true, items: true },
    }),
    prisma.property.findMany({ where: { active: true }, orderBy: { name_address: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Work orders</h1>
          <p className="text-sm text-gray-500">
            {workOrders.length} shown — checks properties due tomorrow and emails/texts the assigned
            team member a link.
          </p>
        </div>
        <SweepButton />
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Property</th>
              <th className="px-4 py-2">Assigned to</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2">Sent</th>
              <th className="px-4 py-2">Progress</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {workOrders.map((wo) => {
              const completedCount = wo.items.filter((i) => i.completed).length;
              return (
                <tr key={wo.id}>
                  <td className="px-4 py-2 font-medium text-gray-900">{wo.property.name_address}</td>
                  <td className="px-4 py-2 text-gray-600">{wo.assignedTeamMember?.name ?? "Unassigned"}</td>
                  <td className="px-4 py-2 text-gray-600">{wo.createdAt.toISOString().slice(0, 10)}</td>
                  <td className="px-4 py-2 text-gray-600">{wo.sent_at ? "Yes" : "No"}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {completedCount}/{wo.items.length}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        wo.status === "Completed"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {wo.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/work-orders/${wo.id}`} className="text-xs font-medium text-gray-600 hover:text-gray-900">
                      View →
                    </Link>
                  </td>
                </tr>
              );
            })}
            {workOrders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  No work orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Create a work order now</h2>
        <form action={createWorkOrderForPropertyAction} className="flex items-end gap-3">
          <div className="flex-1 space-y-1">
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
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Create
          </button>
        </form>
      </div>
    </div>
  );
}
