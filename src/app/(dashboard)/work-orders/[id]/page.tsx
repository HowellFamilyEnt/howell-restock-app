import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { workOrderLink } from "@/lib/workorders";
import { completeWorkOrderItemAction } from "../actions";
import WorkOrderItemRow from "@/components/WorkOrderItemRow";
import CopyLinkButton from "./CopyLinkButton";

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const workOrder = await prisma.workOrder.findUnique({
    where: { id },
    include: {
      property: true,
      assignedTeamMember: true,
      items: { include: { item: true }, orderBy: { item: { name: "asc" } } },
    },
  });

  if (!workOrder) notFound();

  const link = workOrderLink(workOrder.share_token);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/work-orders" className="text-sm text-gray-500 hover:text-gray-900">
          ← Work orders
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">{workOrder.property.name_address}</h1>
        {workOrder.property.address && (
          <p className="text-sm text-gray-500">{workOrder.property.address}</p>
        )}
        <p className="text-sm text-gray-500">
          Assigned to {workOrder.assignedTeamMember?.name ?? "Unassigned"} · Status: {workOrder.status}
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

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="mb-2 text-sm font-medium text-gray-700">Shareable link (no login required)</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
            {link}
          </code>
          <CopyLinkButton link={link} />
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Anyone with this link can see this property&apos;s address and door code — share it only
          with the assigned team member.
        </p>
      </div>

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
                action={completeWorkOrderItemAction.bind(null, workOrder.id, woItem.id)}
              />
            ))}
            {workOrder.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  No par levels were set for this property when the work order was created.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
