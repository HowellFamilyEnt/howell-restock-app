import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { completePublicWorkOrderItemAction } from "./actions";
import WorkOrderItemRow from "@/components/WorkOrderItemRow";

export default async function PublicWorkOrderPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const workOrder = await prisma.workOrder.findUnique({
    where: { share_token: token },
    include: {
      property: true,
      assignedTeamMember: true,
      items: { include: { item: true }, orderBy: { item: { name: "asc" } } },
    },
  });

  if (!workOrder) notFound();

  const completedCount = workOrder.items.filter((i) => i.completed).length;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{workOrder.property.name_address}</h1>
          {workOrder.property.address && (
            <p className="text-sm text-gray-500">{workOrder.property.address}</p>
          )}
          <p className="text-sm text-gray-500">
            {completedCount}/{workOrder.items.length} items completed
            {workOrder.status === "Completed" && " · Work order complete"}
          </p>
        </div>

        {workOrder.property.master_door_code && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">
              Master door code: {workOrder.property.master_door_code}
            </p>
          </div>
        )}

        {workOrder.property.general_notes && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-700">Notes</p>
            <p className="text-sm text-gray-600">{workOrder.property.general_notes}</p>
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Item</th>
                <th className="px-4 py-2">Unit</th>
                <th className="px-4 py-2">Needed</th>
                <th className="px-4 py-2" colSpan={3}>
                  On site / added
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {workOrder.items.map((woItem) => (
                <WorkOrderItemRow
                  key={woItem.id}
                  item={{
                    id: woItem.id,
                    name: woItem.item.name,
                    unit_of_measure: woItem.item.unit_of_measure,
                    qty_needed: woItem.qty_needed,
                    qty_on_site: woItem.qty_on_site,
                    qty_added: woItem.qty_added,
                    completed: woItem.completed,
                  }}
                  action={completePublicWorkOrderItemAction.bind(null, token, woItem.id)}
                />
              ))}
              {workOrder.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                    Nothing to restock on this work order.
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
