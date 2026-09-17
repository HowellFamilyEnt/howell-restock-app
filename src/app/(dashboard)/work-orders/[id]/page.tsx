import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { workOrderLink } from "@/lib/workorders";
import { completeWorkOrderItemAction } from "../actions";
import WorkOrderItemRow from "@/components/WorkOrderItemRow";
import CopyLinkButton from "@/components/CopyLinkButton";
import AssignmentForm from "./AssignmentForm";
import SendButton from "./SendButton";
import StatusControls from "./StatusControls";
import DueDateForm from "./DueDateForm";
import NotesSection from "@/components/NotesSection";
import { addWorkOrderNoteAction } from "../actions";
import { groupByRoom } from "@/lib/roomGroups";

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [workOrder, teamMembers] = await Promise.all([
    prisma.workOrder.findUnique({
      where: { id },
      include: {
        property: true,
        assignedTeamMember: true,
        items: { include: { item: true }, orderBy: { item: { name: "asc" } } },
        notes: { include: { photos: true }, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.teamMember.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  if (!workOrder) notFound();
  const link = workOrderLink(workOrder.share_token);
  const itemsByRoom = groupByRoom(workOrder.items, (woItem) => woItem.item.room_groups);

  const statusStyles: Record<string, string> = {
    Open: "bg-amber-100 text-amber-700",
    Completed: "bg-green-100 text-green-700",
    Archived: "bg-gray-200 text-gray-600",
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/work-orders" className="text-sm text-gray-500 hover:text-gray-900">
          ← Work orders
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-gray-900">{workOrder.property.name_address}</h1>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[workOrder.status]}`}>
            {workOrder.status}
          </span>
        </div>
        {workOrder.property.address && (
          <p className="text-sm text-gray-500">{workOrder.property.address}</p>
        )}
        <p className="text-sm text-gray-500">
          {workOrder.scheduled_for ? `Due ${workOrder.scheduled_for.toISOString().slice(0, 10)}` : "No due date set"}
          {" · "}
          {workOrder.sent_at ? `Sent ${workOrder.sent_at.toISOString().slice(0, 10)}` : "Not sent yet"}
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Due date</h2>
        <DueDateForm
          workOrderId={workOrder.id}
          currentDueDate={workOrder.scheduled_for ? workOrder.scheduled_for.toISOString().slice(0, 10) : null}
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Assignment</h2>
        <AssignmentForm
          workOrderId={workOrder.id}
          teamMembers={teamMembers}
          currentTeamMemberId={workOrder.assigned_team_member_id}
        />
        <div className="mt-3">
          <SendButton workOrderId={workOrder.id} />
        </div>
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

      {workOrder.items.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
          No par levels were set for this property when the work order was created.
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
                  <th className="px-4 py-2">Needed</th>
                  <th className="px-4 py-2" colSpan={3}>
                    On site / added
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {section.items.map((woItem) => (
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
              </tbody>
            </table>
          </div>
        ))
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Notes &amp; photos</h2>
        <p className="mb-4 text-sm text-gray-500">
          Anything noticed on-site that needs attention. Gets emailed to the service admin when this
          work order is completed.
        </p>
        <NotesSection
          notes={workOrder.notes.map((note) => ({
            id: note.id,
            category: note.category,
            description: note.description,
            status: note.status,
            createdAt: note.createdAt.toISOString().slice(0, 10),
            photos: note.photos.map((p) => ({ id: p.id, url: p.url })),
          }))}
          action={addWorkOrderNoteAction.bind(null, workOrder.id, workOrder.property_id)}
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Manage</h2>
        <StatusControls workOrderId={workOrder.id} status={workOrder.status} />
      </div>
    </div>
  );
}
